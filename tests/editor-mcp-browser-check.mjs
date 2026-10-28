import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {decodeZIP} from '../web/resource-zip.js';
import {encodeResourcePack,imageAsset} from '../web/resource-pack.js';
import {encodePNG} from '../web/encoders.js';
import {registerAsset,unregisterAsset,contentHash} from '../web/resource-assets.js';
import {assetFromGeneratorAuthoring,GENERATOR_EXAMPLE} from '../web/generator-authoring.js';
import {node,project,PRESET_SCHEMA} from '../web/tree-model.js';

const root=resolve('.'),out=resolve('test-results/editor-mcp');await mkdir(out,{recursive:true});
const portable=await mkdtemp(resolve(out,'portable-'));for(const [name,data]of await decodeZIP(await readFile('dist/texture-forge-ai-skill.zip'))){const file=resolve(portable,name);await mkdir(resolve(file,'..'),{recursive:true});await writeFile(file,data);}
const cli=resolve(portable,'texture-forge-author/scripts/texforge.mjs');
const p=project();p.name='MCP current work';p.canvas.ratio=1.5;p.output.seconds=2;p.output.exportSeconds=2;
const g=node('group');g.id='group';g.name='Effect group';const heart=node('shape','HeartLeafTeardrop');heart.id='heart';heart.name='Heart';heart.color={mode:'own',fill:'solid',low:'#000000',high:'#ff705d'};heart.postEffects.sketch.enabled=true;heart.postEffects.sketch.fillStyle=3;heart.tracks.opacity={keys:[[0,1],[1,.5]],ease:'linear'};
const mask=node();mask.id='mask';g.mask=mask;g.children=[heart];const circle=node();circle.id='circle';circle.name='Editable circle';circle.params[0]=.24;circle.transform.x=.15;circle.transform.y=.15;circle.transform.width=circle.transform.height=.15;p.root.children=[g,circle];
const pixels=new Float32Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++)pixels.set([x/15,y/15,.8,1],(y*16+x)*4);
const png=await encodePNG(pixels,16,16),image=await imageAsset(new File([png],'Imported.png',{type:'image/png'})),imageId='asset_'+await contentHash(image),generator=assetFromGeneratorAuthoring(GENERATOR_EXAMPLE),generatorId='asset_'+await contentHash(generator);registerAsset(imageId,image);registerAsset(generatorId,generator);
let fixture;try{const n=node('shape',imageId);n.id='image';n.transform.width=n.transform.height=.2;const gen=node('shape',generatorId);gen.id='generator';g.children.push(n,gen);fixture=await encodeResourcePack(p);}finally{unregisterAsset(generatorId);unregisterAsset(imageId);}
await writeFile(resolve(out,'input.zip'),fixture);
const remoteMeta={resourceId:crypto.randomUUID(),versionId:1,personalRevision:0,name:'Isolated remote circle',kind:'formula',category:'Test',description:''},remotePack=await encodeResourcePack({schema:PRESET_SCHEMA,name:remoteMeta.name,root:node(),graphicResource:remoteMeta});
const remoteIndex={schema:'momo.texture-remote-library/v1',libraryId:crypto.randomUUID(),name:'Isolated regression catalog',entries:[{...remoteMeta,file:'resource.zip',sha256:createHash('sha256').update(remotePack).digest('hex'),thumbnail:'',tags:[]}]};
let slowRemote=null,remoteStarted=0,remoteAborted=0;
const server=createServer(async(req,res)=>{try{if(req.url===slowRemote){remoteStarted++;res.writeHead(200,{'Content-Type':req.url.endsWith('.json')?'application/json':'application/octet-stream'});res.write(' ');res.on('close',()=>remoteAborted++);return;}if(req.url==='/_remote/index.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(remoteIndex));return;}if(req.url==='/_remote/resource.zip'){res.end(remotePack);return;}const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(root,pathname==='/built.html'?'site/index.html':(pathname.startsWith('/assets/')?'site/':'web/')+(pathname==='/'?'index.html':decodeURIComponent(pathname).slice(1)));if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
const reserve=createServer();await new Promise(done=>reserve.listen(0,'127.0.0.1',done));const port=reserve.address().port;await new Promise(done=>reserve.close(done));const serviceURL='http://127.0.0.1:'+port;
// Redirect only the helper address to an isolated test port; retain real browser CORS/network handling.
const isolateService=context=>context.addInitScript(({serviceURL})=>{const request=globalThis.fetch.bind(globalThis);globalThis.fetch=(input,options)=>request(typeof input==='string'&&input.startsWith('http://127.0.0.1:8798/')?serviceURL+input.slice('http://127.0.0.1:8798'.length):input,options);},{serviceURL});
const child=spawn(process.execPath,[cli,'mcp','--port',String(port),'--output-dir',resolve(out,'snapshots')],{cwd:portable,windowsHide:true,stdio:['ignore','pipe','pipe']});let stderr='',ready='';child.stderr.on('data',b=>stderr+=b);
await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('MCP startup timed out: '+stderr)),15000);child.stdout.on('data',b=>{ready+=b;if(ready.includes('Texture Forge MCP:')){clearTimeout(timer);done();}});child.once('exit',code=>{clearTimeout(timer);fail(Error('MCP exited '+code+': '+stderr));});});
const client=new Client({name:'texture-forge-regression',version:'1.0.0'},{capabilities:{}});let browser,configuration;
const call=async(name,args={})=>{const result=await client.callTool({name,arguments:args},undefined,{timeout:180000});assert.ok(!result.isError,name+': '+result.content?.[0]?.text);return result;};
const data=async(name,args)=>(await call(name,args)).structuredContent;
const saved=page=>page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1'));
const checks=[];
try{
 browser=await chromium.launch({headless:true});
 for(const mode of process.argv.includes('--built-only')?['built','https']:process.argv.includes('--built')?['source','built','https']:['source']){
  console.log('Checking '+mode+' editor');const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await isolateService(context);
  if(mode==='https'){
   await context.grantPermissions(['local-network-access'],{origin:'https://breezymomo.github.io'});
   await page.route('https://breezymomo.github.io/MomoTextureForge/**',async route=>{const url=new URL(route.request().url()),file=resolve(root,'site',decodeURIComponent(url.pathname.slice('/MomoTextureForge/'.length))||'index.html');if(!file.startsWith(resolve(root,'site')+sep)){await route.abort();return;}try{await route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[extname(file)]??'application/octet-stream',body:await readFile(file)});}catch{await route.abort();}});
  }
  await page.goto(mode==='https'?'https://breezymomo.github.io/MomoTextureForge/':origin+(mode==='built'?'/built.html':'/'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  await page.locator('#project-file').setInputFiles({name:'Current work.zip',mimeType:'application/zip',buffer:Buffer.from(fixture)});await page.waitForFunction(()=>document.querySelector('#node-tree [data-node-id="heart"]'));
  await page.locator('#language-settings').selectOption('en');const baseline=await saved(page);
  const openConnection=async()=>{await page.locator('#ai-tools').click();await page.locator('.ai-tools-dialog [data-connection-open]').click();};
  await openConnection();const dialog=page.locator('.editor-ai-dialog');assert.equal(await dialog.locator('input[type=password]').count(),0);
  // Closing the panel during registration must preserve the explicit enable action.
  let releaseRegistration,registrationStarted;const held=new Promise(done=>releaseRegistration=done),started=new Promise(done=>registrationStarted=done),registerURL=serviceURL+'/pages';
  await page.route(registerURL,async route=>{if(route.request().method()==='OPTIONS'){await route.continue();return;}const response=await route.fetch();registrationStarted();await held;await route.fulfill({response});});
  await dialog.locator('[data-connect]').click();await started;await dialog.locator('[data-close]').click();releaseRegistration();
  await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='true');await page.unroute(registerURL);
  await openConnection();configuration=JSON.parse(await dialog.locator('textarea').inputValue()).mcpServers['texture-forge'];
  if(mode==='source'||process.argv.includes('--built-only')&&mode==='built'){
   await client.connect(new StreamableHTTPClientTransport(new URL(configuration.url),{requestInit:{headers:configuration.headers}}));
   const tools=(await client.listTools()).tools;assert.deepEqual(tools.map(t=>t.name).sort(),['forge_capture','forge_catalog','forge_edit','forge_pages','forge_guide','forge_inspect','forge_render','forge_resource','forge_schema','forge_status','forge_editor_state','forge_history','forge_project_open','forge_project_save','forge_library','forge_library_export','forge_library_aliases','forge_help','forge_timeline','forge_timeline_edit','forge_list_view','forge_list_view_edit','forge_inspector','forge_inspector_edit','forge_directory_open','forge_directory','forge_remote_job','forge_remote','forge_remote_edit','forge_component','forge_component_edit','forge_preview_capture','forge_workspace','forge_workspace_edit','forge_examples','forge_example_open','forge_project_share','forge_deliver','forge_editor_control','forge_export_start','forge_export_job','forge_library_process_image','forge_library_edit_resource','forge_library_export_batch','forge_library_import','forge_library_create','forge_library_update','forge_library_save_node','forge_library_delete','forge_graphics_list','forge_graphics_list_edit','forge_graphics_list_batch','forge_graphics_list_job'].sort());
   assert.ok((await call('forge_guide',{topic:'live',language:'en'})).content[0].text.includes('forge_capture'));checks.push('real SDK Streamable HTTP initialization, discovery and portable guide');
  }
  const pages=(await data('forge_pages')).pages;assert.equal(pages.length,1);const pageId=pages[0].pageId;assert.equal(pages[0].name,p.name);
  await dialog.locator('[data-config]').evaluate(el=>el.open=true);await dialog.locator('[data-copy]').click();assert.match(await dialog.locator('[role=status]').innerText(),/copied|Select and copy/);
  await dialog.locator('[data-close]').click();
  let first=await data('forge_capture',{pageId});assert.equal(first.name,p.name);assert.equal(first.cycleSeconds,2);assert.equal(first.revision,createHash('sha256').update(await readFile(first.sourceProject)).digest('hex'));assert.equal(await saved(page),baseline);
  const editorBefore=await data('forge_editor_state',{pageId});
  const controlled=await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{selection:['circle'],primary:'circle',progress:.25,animationMode:'base',preview:{mode:'canvas',zoom:'fit',pan:[12,-8],solo:true,tiled:true,tileGrid:2,showGuides:false}}});
  assert.equal(controlled.editRevision,first.editRevision);assert.equal(controlled.state.selection.primary,'circle');assert.equal(controlled.state.playback.progress,.25);assert.deepEqual(controlled.state.preview.pan,[12,-8]);assert.equal(controlled.state.history.revision,editorBefore.history.revision);assert.equal(await saved(page),baseline);
  await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{selection:[],progress:0,animationMode:'normal',preview:{solo:false,tiled:false,pan:[0,0],showGuides:editorBefore.preview.showGuides}}});
  if(mode==='source'){
   const timelineBefore=await data('forge_timeline',{pageId}),timelineChanged=await data('forge_timeline_edit',{pageId,expectedTimelineRevision:timelineBefore.revision,changes:{view:'curves',curvePath:{id:'heart',path:'opacity'},zoom:2,start:.25,snap:'frames',filter:'animated',selection:[{id:'heart',path:'opacity',time:0}]}});
   assert.equal(timelineChanged.settings.scope,'heart');assert.equal(timelineChanged.settings.view,'curves');assert.equal(timelineChanged.settings.selection.length,1);
   assert.equal(await page.locator('[data-animation-view="curves"]').getAttribute('aria-pressed'),'true');
   const timelineRestored=await data('forge_timeline_edit',{pageId,expectedTimelineRevision:timelineChanged.revision,changes:{restore:timelineBefore.settings}});assert.deepEqual(timelineRestored.settings,timelineBefore.settings);assert.equal(await saved(page),baseline);
   await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{selection:[],progress:0}});
   const listViewBefore=await data('forge_list_view',{pageId}),favoriteId=listViewBefore.listIds[0];assert.ok(favoriteId);
   const filteredList=await data('forge_list_view_edit',{pageId,expectedViewRevision:listViewBefore.revision,changes:{mode:'favorites',favorites:[{id:favoriteId,favorite:true}],query:'',categories:[]}});assert.ok(filteredList.visibleIds.includes(favoriteId));
   const groupKey=filteredList.presentation.groups[0].key;
   const collapsedList=await data('forge_list_view_edit',{pageId,expectedViewRevision:filteredList.revision,changes:{groups:[{category:groupKey,open:false}]}});
   assert.equal(collapsedList.presentation.groups.find(g=>g.key===groupKey).open,false);
   assert.equal(await page.locator('#shape-library details[data-category]').first().evaluate(e=>e.open),false);
   const restoredListView=await data('forge_list_view_edit',{pageId,expectedViewRevision:collapsedList.revision,changes:{restore:listViewBefore.settings}});assert.deepEqual(restoredListView.settings,listViewBefore.settings);assert.equal(await saved(page),baseline);
   assert.ok(restoredListView.presentation.groups.every(g=>g.open===!listViewBefore.settings.closedGroups.includes(g.key)));
   const originalLibrary=await data('forge_library',{pageId,source:'builtin',query:'Circle'}),circleKey=originalLibrary.items.find(i=>i.builtin==='Circle').key;
   const authored=await data('forge_library_export',{pageId,key:circleKey,format:'authoring'}),draft=JSON.parse(await readFile(authored.file,'utf8'));assert.equal(draft.schema,'momo.graphic-authoring/v1');
   const catalogFile=await data('forge_library_export_batch',{pageId,keys:[circleKey],format:'catalog'});assert.equal(JSON.parse(await readFile(catalogFile.file,'utf8')).entries.length,1);
   const previewDraft=await data('forge_library_create',{pageId,inputFile:authored.file,expectedLibraryRevision:originalLibrary.revision,previewOnly:true,previewTime:.5,metadata:{name:'Preview only'}});assert.equal(previewDraft.applied,false);assert.equal(previewDraft.previewTime,.5);assert.equal((await readFile(previewDraft.preview)).subarray(1,4).toString(),'PNG');assert.equal((await data('forge_library',{pageId})).revision,originalLibrary.revision);
   const timePreviews=[];for(const previewTime of [0,.25])timePreviews.push(await data('forge_library_create',{pageId,inputFile:resolve('skills/texture-forge-author/references/example.graphic.json'),expectedLibraryRevision:originalLibrary.revision,previewOnly:true,previewTime}));assert.notEqual(timePreviews[0].sha256,timePreviews[1].sha256);
   const generators=await data('forge_library',{pageId,source:'builtin',kind:'generator'}),generatorKey=generators.items[0].key,generatorDetail=await data('forge_library',{pageId,key:generatorKey,includeSource:true}),generatorDefinition=generatorDetail.source.assets[0].asset.definition,generatorParameter=generatorDefinition.parameters.find(p=>p.variable);
   const generatorPreview=await data('forge_library_edit_resource',{pageId,key:generatorKey,expectedLibraryRevision:generators.revision,previewOnly:true,defaults:{[generatorParameter.variable]:generatorParameter.min}});assert.equal(generatorPreview.applied,false);assert.equal((await data('forge_library',{pageId})).revision,generators.revision);
   const generatorCopy=await data('forge_library_edit_resource',{pageId,key:generatorKey,expectedLibraryRevision:generators.revision,metadata:{name:'Native generator copy'},defaults:{[generatorParameter.variable]:generatorParameter.min}}),generatorCopyDetail=await data('forge_library',{pageId,key:generatorCopy.key,includeSource:true});assert.equal(generatorCopyDetail.item.kind,'generator');assert.deepEqual(generatorCopyDetail.source.assets[0].asset.definition.generator,generatorDefinition.generator);await data('forge_library_delete',{pageId,key:generatorCopy.key,expectedLibraryRevision:generatorCopyDetail.revision});
   const originalCreated=await data('forge_library_create',{pageId,inputFile:authored.file,expectedLibraryRevision:originalLibrary.revision});
   const afterCreation=await data('forge_library',{pageId,source:'local'});
   const aliased=await data('forge_library_aliases',{pageId,key:originalCreated.key,expectedLibraryRevision:afterCreation.revision,aliases:{en:'Alias fixture','zh-CN':'别名测试'},parameters:[{variable:draft.parameters[0].variable,aliases:{en:'Fixture radius'}}]});
   const aliasSource=await data('forge_library',{pageId,key:aliased.key,includeSource:true});assert.equal(aliasSource.item.aliases.en,'Alias fixture');assert.equal(aliasSource.source.assets[0].asset.definition.parameters[0].aliases.en,'Fixture radius');
   const afterAlias=await data('forge_library',{pageId,source:'local'});await data('forge_library_delete',{pageId,key:aliased.key,expectedLibraryRevision:afterAlias.revision});assert.equal((await data('forge_library',{pageId})).revision,originalLibrary.revision);assert.equal(await saved(page),baseline);
   for(const language of ['zh-CN','en'])assert.equal((await data('forge_help',{pageId,language})).sections.length,6);
   for(const kind of ['author','effects']){const download=await data('forge_help',{pageId,kind});const skillFiles=await decodeZIP(await readFile(download.file));assert.ok([...skillFiles.keys()].some(key=>key.endsWith('/SKILL.md')));}
   await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{selection:['circle']}});
   const inspectorBefore=await data('forge_inspector',{pageId}),moduleKey=inspectorBefore.modules[0].key;
   const inspectorChanged=await data('forge_inspector_edit',{pageId,expectedInspectorRevision:inspectorBefore.revision,changes:{expanded:[{key:moduleKey,open:false}],order:[...inspectorBefore.order].reverse(),pins:[{nodeId:'circle',key:'editor.nodeColors',pinned:true}]}});
   assert.equal(inspectorChanged.modules.find(m=>m.key===moduleKey).open,false);assert.deepEqual(inspectorChanged.order,[...inspectorBefore.order].reverse());assert.ok(inspectorChanged.settings.shortcuts.nodes.circle.pinned.includes('editor.nodeColors'));
   assert.equal(await page.locator('#inspector [data-module="'+moduleKey+'"]').first().getAttribute('open'),null);
   const staleInspector=await client.callTool({name:'forge_inspector_edit',arguments:{pageId,expectedInspectorRevision:inspectorBefore.revision,changes:{tab:'layout'}}});assert.equal(staleInspector.isError,true);
   const pinCapture=await data('forge_capture',{pageId});await data('forge_edit',{snapshotId:pinCapture.snapshotId,mode:'edit',recipe:{schema:'momo.project-authoring/v1',operations:[{op:'duplicate-node',node:'circle',id:'shortcut-copy'},{op:'duplicate-node',node:'shortcut-copy',id:'shortcut-copy-2'}]}});
   const copiedPins=await data('forge_inspector',{pageId});for(const id of ['shortcut-copy','shortcut-copy-2'])assert.ok(copiedPins.settings.shortcuts.nodes[id].pinned.includes('editor.nodeColors'));
   const copyHistory=await data('forge_editor_state',{pageId}),copySnapshot=await data('forge_capture',{pageId});await data('forge_history',{snapshotId:copySnapshot.snapshotId,action:'undo',expectedHistoryRevision:copyHistory.history.revision});
   const beforePinRestore=await data('forge_inspector',{pageId});
   const inspectorRestored=await data('forge_inspector_edit',{pageId,expectedInspectorRevision:beforePinRestore.revision,changes:{restore:inspectorBefore.settings}});assert.deepEqual(inspectorRestored.settings,inspectorBefore.settings);assert.equal(await saved(page),baseline);editorBefore.history=(await data('forge_editor_state',{pageId})).history;
   await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{selection:[]}});
   for(const tool of ['pivot','uv','pan','transform']){const next=await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{preview:{tool,snap:false}}});assert.equal(next.state.preview.tool,tool);assert.equal(next.state.preview.snap,false);assert.equal(next.state.history.revision,editorBefore.history.revision);assert.equal(await saved(page),baseline);}
   await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{preview:{snap:true}}});
   const views=await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{material:{model:2,metallic:.6,ambientIntensity:.42,lightIntensity:.75,orbit:[1,.3]},effect:{background:'custom',blend:'add',color:'#334455',size:.5},appearance:{theme:'qingci',density:'comfortable'},language:'en'}});
   assert.equal(views.state.material.model,2);assert.deepEqual(views.state.material.orbit,[1,.3]);assert.equal(views.state.effect.color,'#334455');assert.equal(views.state.preferences.language,'en');assert.equal(views.state.preferences.appearance.theme,'qingci');assert.equal(await saved(page),baseline);assert.equal(views.state.history.revision,editorBefore.history.revision);
   const invalidPrefs=await client.callTool({name:'forge_editor_control',arguments:{snapshotId:first.snapshotId,changes:{selection:['heart'],appearance:{theme:'missing'}}}});assert.equal(invalidPrefs.isError,true);assert.deepEqual((await data('forge_editor_state',{pageId})).selection,views.state.selection);
   assert.equal(views.state.material.ambientIntensity,.42);assert.equal(views.state.material.lightIntensity,.75);
   await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{material:{model:0,metallic:0,ambientIntensity:.18,lightIntensity:1,resetView:true},effect:{reset:true},appearance:editorBefore.preferences.appearance,language:editorBefore.preferences.language}});
   for(const mode of ['canvas','material','effect']){
    await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{preview:{mode},effect:{background:'compare',blend:'compare'}}});
    const actual=await call('forge_preview_capture',{pageId});assert.equal(actual.structuredContent.mode,mode);assert.equal(actual.content.filter(x=>x.type==='image').length,mode==='effect'?4:1);
    for(const frame of actual.structuredContent.files){assert.ok(frame.width>1&&frame.height>1);assert.equal((await readFile(frame.file)).subarray(1,4).toString(),'PNG');}
   }
   await data('forge_editor_control',{snapshotId:first.snapshotId,changes:{preview:{mode:'canvas'},effect:{reset:true}}});assert.equal(await saved(page),baseline);
   const workspaceBefore=await data('forge_workspace',{pageId});
   const workspaceChanged=await data('forge_workspace_edit',{pageId,expectedWorkspaceRevision:workspaceBefore.revision,operations:[{action:'preset',preset:'animation'},{action:'save',name:'MCP layout'},{action:'float',panel:'inspector',rect:{x:.1,y:.1,w:.4,h:.6}}]});assert.equal(workspaceChanged.settings.current.floats.length,1);assert.equal(await saved(page),baseline);
   const staleLayout=await client.callTool({name:'forge_workspace_edit',arguments:{pageId,expectedWorkspaceRevision:workspaceBefore.revision,operations:[{action:'preset',preset:'focus'}]}});assert.equal(staleLayout.isError,true);
   const workspaceRestored=await data('forge_workspace_edit',{pageId,expectedWorkspaceRevision:workspaceChanged.revision,operations:[{action:'restore',settings:workspaceBefore.settings}]});assert.deepEqual(workspaceRestored.settings,workspaceBefore.settings);assert.equal((await data('forge_editor_state',{pageId})).history.revision,editorBefore.history.revision);
   const remoteBefore=await data('forge_remote',{pageId});
   let remote=await data('forge_remote_edit',{pageId,expectedRemoteRevision:remoteBefore.revision,action:'add',config:{name:'Isolated source',url:origin+'/_remote/index.json'}});const sourceId=remote.result.id;assert.equal(remote.result.autoCheck,false);assert.equal(remote.catalogs.length,0);
   const cancelRemote=async(action,path)=>{
    slowRemote=path;const starts=remoteStarted,aborts=remoteAborted,before=await data('forge_remote',{pageId});
    const job=await data('forge_remote_edit',{pageId,expectedRemoteRevision:before.revision,action,sourceId,resourceId:remoteMeta.resourceId,background:true});
    for(let i=0;i<100&&remoteStarted===starts;i++)await new Promise(r=>setTimeout(r,25));assert.equal(remoteStarted,starts+1);
    assert.equal((await data('forge_remote_job',{pageId,jobId:job.jobId,action:'cancel'})).status,'canceled');
    const after=await data('forge_remote',{pageId});assert.equal(after.revision,before.revision);
    for(let i=0;i<100&&remoteAborted===aborts;i++)await new Promise(r=>setTimeout(r,25));assert.equal(remoteAborted,aborts+1);
    assert.equal((await data('forge_remote_job',{pageId,jobId:job.jobId})).status,'canceled');slowRemote=null;
   };
   await cancelRemote('refresh','/_remote/index.json');
   remote=await data('forge_remote_edit',{pageId,expectedRemoteRevision:remote.revision,action:'refresh',sourceId});assert.equal(remote.catalogs[0].count,1);assert.equal(remote.downloads.length,0);
   await cancelRemote('download','/_remote/resource.zip');
   remote=await data('forge_remote_edit',{pageId,expectedRemoteRevision:remote.revision,action:'download',sourceId,resourceId:remoteMeta.resourceId});assert.equal(remote.downloads.length,1);
   remote=await data('forge_remote_edit',{pageId,expectedRemoteRevision:remote.revision,action:'update',sourceId,config:{enabled:false}});assert.equal(remote.sources[0].enabled,false);
   remote=await data('forge_remote_edit',{pageId,expectedRemoteRevision:remote.revision,action:'remove',sourceId});assert.equal(remote.sources.length,0);assert.equal(remote.downloads.length,1);
   remote=await data('forge_remote_edit',{pageId,expectedRemoteRevision:remote.revision,action:'delete-cache',sourceId,resourceId:remoteMeta.resourceId});assert.equal(remote.revision,remoteBefore.revision);assert.equal(await saved(page),baseline);
   const libraryFolder=await mkdtemp(resolve(out,'directory-sdk-')),resourceFile=resolve(out,'directory-resource.zip');await writeFile(resourceFile,remotePack);
   let directory=await data('forge_directory_open',{directory:libraryFolder});assert.equal(directory.revision,'missing');
   const plan=await data('forge_directory',{handleId:directory.handleId,expectedRevision:directory.revision,action:'preview-import',inputFiles:[resourceFile]});
   const applied=await data('forge_directory',{handleId:directory.handleId,expectedRevision:directory.revision,action:'apply-import',previewId:plan.previewId});
   directory=await data('forge_directory',{handleId:directory.handleId,action:'read'});assert.equal(directory.index.entries.length,1);assert.equal(directory.index.entries[0].resourceId,remoteMeta.resourceId);
   const exportedIndex=await data('forge_directory',{handleId:directory.handleId,expectedRevision:directory.revision,action:'export-index'});assert.deepEqual(JSON.parse(await readFile(exportedIndex.file,'utf8')),directory.index);
   const listedExamples=await data('forge_examples',{pageId});assert.ok(listedExamples.examples.length>10);
   const unavailableShare=await data('forge_project_share',{snapshotId:first.snapshotId});assert.equal(unavailableShare.reason,'custom-dependencies');
   const started=await data('forge_export_start',{snapshotId:first.snapshotId,format:'png',seconds:.25});let job=started;
   for(let i=0;i<120&&['queued','running'].includes(job.status);i++){await new Promise(resolve=>setTimeout(resolve,250));job=await data('forge_export_job',{jobId:started.jobId});}
   assert.equal(job.status,'completed',job.error);const output=await readFile(job.result.file);assert.equal(output.subarray(1,4).toString(),'PNG');assert.equal(job.result.sha256,createHash('sha256').update(output).digest('hex'));assert.equal(await saved(page),baseline);checks.push('portable native export worker, job progress and actual PNG');
   const handoff=await data('forge_deliver',{snapshotId:first.snapshotId,kind:'handoff',times:[0],size:32});assert.ok(handoff.files.some(f=>f.file.endsWith('IMPLEMENT.md')));assert.equal(handoff.files.find(f=>f.file.endsWith('source-project.zip')).sha256,first.revision);
   const unsupported=await client.callTool({name:'forge_deliver',arguments:{snapshotId:first.snapshotId,kind:'shader',shaderMode:'handdrawn',nodeId:'circle'}},undefined,{timeout:180000});assert.equal(unsupported.isError,true);assert.match(unsupported.content[0].text,/Retired|retired/);
   const noFallback=await client.callTool({name:'forge_deliver',arguments:{snapshotId:first.snapshotId,kind:'shader',nodeId:'heart',times:[0],size:32}},undefined,{timeout:180000});assert.equal(noFallback.isError,true);assert.match(noFallback.content[0].text,/not implemented|not part|keyframe/);
   const support=await data('forge_deliver',{snapshotId:first.snapshotId,kind:'shader-support',nodeId:'circle'});assert.equal(support.support.supported,true);
   const realtime=await data('forge_deliver',{snapshotId:first.snapshotId,kind:'shader',shaderMode:'realtime',nodeId:'circle',times:[0,.75],size:64});assert.equal(realtime.manifest.schema,'momo.realtime-shader/v1');assert.equal(realtime.manifest.source.snapshotId,first.snapshotId);assert.equal(realtime.manifest.source.archiveSHA256,first.revision);assert.deepEqual(realtime.manifest.time.references,[0,.75]);
   const blockedShader=await client.callTool({name:'forge_deliver',arguments:{snapshotId:first.snapshotId,kind:'shader',shaderMode:'realtime',times:[0],size:32}},undefined,{timeout:180000});assert.equal(blockedShader.isError,true);assert.match(blockedShader.content[0].text,/heart/);checks.push('realtime support query, immutable Shader package, retired modes rejected without fallback and whole-graph refusal');
   const paletteEdit=await data('forge_edit',{snapshotId:first.snapshotId,recipe:{schema:'momo.project-authoring/v1',operations:[{op:'gradient',node:'circle',action:'preset',preset:'palettes.ice'},{op:'gradient',node:'circle',action:'reverse'},{op:'curves',node:'circle',action:'preset',channel:'red',preset:'contrast'}]}});
   const paletteSnapshot=await data('forge_capture',{pageId}),paletteState=await data('forge_editor_state',{pageId});await data('forge_history',{snapshotId:paletteSnapshot.snapshotId,action:'undo',expectedHistoryRevision:paletteState.history.revision});assert.equal(await saved(page),baseline);
  }
  if(mode==='source'){
   const batchList=await data('forge_graphics_list',{pageId}),batchSnapshot=await data('forge_capture',{pageId}),batchLibraryBefore=await data('forge_library',{pageId}),unused=[];let batchLibrary=batchLibraryBefore;for(let i=0;i<2;i++){unused.push(await data('forge_library_create',{pageId,inputFile:resolve('skills/texture-forge-author/references/example.graphic.json'),expectedLibraryRevision:batchLibrary.revision}));batchLibrary=await data('forge_library',{pageId});}
   const batch=await data('forge_graphics_list_batch',{snapshotId:batchSnapshot.snapshotId,expectedListRevision:batchList.revision,expectedLibraryRevision:batchLibrary.revision,keys:unused.map(i=>i.key)});let batchState=batch;
   for(let i=0;i<100&&['queued','running','canceling'].includes(batchState.status);i++){await new Promise(resolve=>setTimeout(resolve,50));batchState=await data('forge_graphics_list_job',{pageId,jobId:batch.jobId});}assert.equal(batchState.status,'completed',batchState.error);assert.equal(batchState.result.added.length,2,JSON.stringify(batchState));
   const batchAfter=await data('forge_capture',{pageId}),batchHistory=await data('forge_editor_state',{pageId});await data('forge_history',{snapshotId:batchAfter.snapshotId,action:'undo',expectedHistoryRevision:batchHistory.history.revision});assert.equal(await saved(page),baseline);assert.equal((await data('forge_graphics_list',{pageId})).revision,batchList.revision);for(const item of unused){const lib=await data('forge_library',{pageId});await data('forge_library_delete',{pageId,key:item.key,expectedLibraryRevision:lib.revision});}assert.equal((await data('forge_library',{pageId})).revision,batchLibraryBefore.revision);
   const entries=await data('forge_graphics_list',{pageId}),added=await data('forge_graphics_list_edit',{snapshotId:first.snapshotId,expectedListRevision:entries.revision,action:'save-node',nodeId:'circle',name:'Trial fixture'});
   let session=await data('forge_component',{pageId});assert.equal(session.active,false);
   session=await data('forge_component_edit',{pageId,expectedSessionRevision:session.revision,action:'open',entryId:added.entryId});assert.equal(session.active,true);const trialId=session.project.root.children[0].id;
   assert.equal((await data('forge_graphics_list',{pageId,id:added.entryId})).entry.id,added.entryId);
   const blocked=await client.callTool({name:'forge_capture',arguments:{pageId}});assert.equal(blocked.isError,true);
   session=await data('forge_component_edit',{pageId,expectedSessionRevision:session.revision,action:'edit',recipe:{schema:'momo.project-authoring/v1',operations:[{op:'patch-node',node:trialId,values:{name:'Trial changed'}}]}});assert.equal(session.project.root.children[0].name,'Trial changed');
   const trial=await data('forge_capture',{pageId,context:'component'});assert.equal(trial.context,'component');assert.match(trial.editRevision,/^component:/);
   await data('forge_render',{snapshotId:trial.snapshotId,times:[0],size:32});
   const wrongScope=await client.callTool({name:'forge_edit',arguments:{snapshotId:trial.snapshotId,recipe:{schema:'momo.project-authoring/v1',operations:[{op:'add-node',id:'must-not-insert',graphic:'Circle'}]}}});assert.equal(wrongScope.isError,true);
   session=await data('forge_component_edit',{pageId,expectedSessionRevision:session.revision,action:'reset'});assert.notEqual(session.project.root.children[0].name,'Trial changed');
   session=await data('forge_component_edit',{pageId,expectedSessionRevision:session.revision,action:'return'});assert.equal(session.active,false);
   const owner=await data('forge_capture',{pageId}),ownerState=await data('forge_editor_state',{pageId});await data('forge_history',{snapshotId:owner.snapshotId,action:'undo',expectedHistoryRevision:ownerState.history.revision});assert.equal(await saved(page),baseline);
  }
  if(mode!=='source'){
   const library=await data('forge_library',{pageId}),inputFile=resolve('skills/texture-forge-author/references/example.graphic.json');
   const preview=await data('forge_library_create',{pageId,inputFile,expectedLibraryRevision:library.revision,previewOnly:true,previewTime:.25});assert.equal(preview.previewOnly,true);assert.equal((await readFile(preview.preview)).subarray(1,4).toString(),'PNG');assert.equal((await data('forge_library',{pageId})).revision,library.revision);
   const created=await data('forge_library_create',{pageId,inputFile,expectedLibraryRevision:library.revision,metadata:{name:'Static batch fixture'}}),libraryAfter=await data('forge_library',{pageId}),list=await data('forge_graphics_list',{pageId}),snapshot=await data('forge_capture',{pageId});
   const job=await data('forge_graphics_list_batch',{snapshotId:snapshot.snapshotId,expectedListRevision:list.revision,expectedLibraryRevision:libraryAfter.revision,keys:[created.key]});let status=job;
   for(let i=0;i<100&&['queued','running'].includes(status.status);i++){await new Promise(resolve=>setTimeout(resolve,50));status=await data('forge_graphics_list_job',{pageId,jobId:job.jobId});}assert.equal(status.status,'completed',status.error);assert.deepEqual(status.result.added,[created.key]);
   const after=await data('forge_capture',{pageId}),history=await data('forge_editor_state',{pageId});await data('forge_history',{snapshotId:after.snapshotId,action:'undo',expectedHistoryRevision:history.history.revision});assert.equal(await saved(page),baseline);assert.equal((await data('forge_graphics_list',{pageId})).revision,list.revision);
   await data('forge_library_delete',{pageId,key:created.key,expectedLibraryRevision:libraryAfter.revision});assert.equal((await data('forge_library',{pageId})).revision,library.revision);
   checks.push(mode+': no-save resource preview at explicit time, metadata and native batch with undo');
  }
  first=await data('forge_capture',{pageId});
  const summary=await data('forge_inspect',{snapshotId:first.snapshotId});assert.ok(summary.nodes.some(n=>n.id==='mask'));assert.ok(summary.resources.some(r=>r.kind==='generator'));assert.ok(summary.resources.some(r=>r.kind==='image'));
  const detail=await data('forge_inspect',{snapshotId:first.snapshotId,nodeId:'heart',times:[1]});assert.equal(detail.node.samples[0].opacity,.75);assert.equal(detail.node.effects[0].id,'sketch');
  const imageResource=summary.resources.find(r=>r.kind==='image'),readImage=await call('forge_resource',{snapshotId:first.snapshotId,resourceId:imageResource.id});assert.ok(readImage.content.some(c=>c.type==='image'));assert.deepEqual(await readFile(readImage.structuredContent.asset.imageFile),Buffer.from(png));
  const genResource=summary.resources.find(r=>r.kind==='generator'),readGenerator=await data('forge_resource',{snapshotId:first.snapshotId,resourceId:genResource.id});assert.ok(readGenerator.asset.libraries['generator-pass-0'].includes('generate'));
  const render=await call('forge_render',{snapshotId:first.snapshotId,nodeId:'heart',beforeEffect:'sketch',channel:'alpha',times:[0,1],size:96});assert.equal(render.structuredContent.width,96);assert.equal(render.structuredContent.height,64);assert.ok(render.content.some(c=>c.type==='image'));assert.equal(render.structuredContent.verification.editorRendering,'passed');
  await page.locator('#node-tree [data-node-id="circle"] .tree-node-name').first().click();await page.locator('#inspector-tabs').getByRole('button',{name:'Shape',exact:true}).click();const radius=page.locator('#inspector input[type=number][data-animation-path="params.0"]');await radius.fill('.42');await radius.press('Tab');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')).root.children.find(n=>n.id==='circle').params[0]===.42);
  const second=await data('forge_capture',{pageId});assert.notEqual(first.revision,second.revision);assert.equal((await data('forge_inspect',{snapshotId:first.snapshotId,nodeId:'circle'})).node.base.params[0],.24);assert.equal((await data('forge_inspect',{snapshotId:second.snapshotId,nodeId:'circle'})).node.base.params[0],.42);
  // Author through the real MCP service into the static page, without UI clicks
  // for creation or effects. A single Undo must restore the user's entire work.
  const schema=await data('forge_schema',{pageId});assert.ok(schema.operations['set-effect']);assert.ok(schema.effects.some(e=>e.id==='sketch'));
  const catalog=await data('forge_catalog',{pageId,graphic:'HeartLeafTeardrop'});assert.equal(catalog.graphics[0].id,'HeartLeafTeardrop');assert.ok(catalog.graphics[0].definition);
  const authoredRecipe={schema:'momo.project-authoring/v1',name:'AI heart sketch',operations:[{op:'add-node',id:'ai-heart',graphic:'HeartLeafTeardrop',name:'AI heart'},{op:'set-effect',node:'ai-heart',effect:'sketch',parameters:{fillStyle:3}}]};
  const beforeEdit=await saved(page);
  assert.equal((await client.callTool({name:'forge_edit',arguments:{snapshotId:first.snapshotId,recipe:authoredRecipe}})).isError,true);assert.equal(await saved(page),beforeEdit);
  const invalidRecipe={...authoredRecipe,operations:[...authoredRecipe.operations,{op:'set-effect',node:'ai-heart',effect:'does-not-exist'}]};
  assert.equal((await client.callTool({name:'forge_edit',arguments:{snapshotId:second.snapshotId,recipe:invalidRecipe}})).isError,true);assert.equal(await saved(page),beforeEdit);
  assert.equal((await data('forge_edit',{snapshotId:second.snapshotId,mode:'create',recipe:authoredRecipe})).applied,true);
  await page.waitForFunction(()=>document.querySelector('#node-tree [data-node-id="ai-heart"]'));
  const written=JSON.parse(await saved(page));assert.equal(written.name,'AI heart sketch');assert.equal(written.root.children.length,1);assert.equal(written.root.children[0].postEffects.sketch.enabled,true);assert.equal(written.root.children[0].postEffects.sketch.fillStyle,3);
  assert.equal((await client.callTool({name:'forge_edit',arguments:{snapshotId:second.snapshotId,mode:'create',recipe:authoredRecipe}})).isError,true);
  const authored=await data('forge_capture',{pageId});assert.equal(authored.name,'AI heart sketch');assert.ok((await data('forge_inspect',{snapshotId:authored.snapshotId,nodeId:'ai-heart'})).node.effects.some(e=>e.id==='sketch'));
  assert.equal((await data('forge_render',{snapshotId:authored.snapshotId,size:64,times:[0]})).verification.editorRendering,'passed');
  await page.locator('#undo').click();assert.equal(await saved(page),beforeEdit);await page.locator('#redo').click();assert.equal(JSON.parse(await saved(page)).name,'AI heart sketch');await page.locator('#undo').click();assert.equal(await saved(page),beforeEdit);
  const editBase=await data('forge_capture',{pageId});assert.equal((await data('forge_edit',{snapshotId:editBase.snapshotId,recipe:{schema:'momo.project-authoring/v1',operations:[{op:'set-parameter',node:'circle',parameter:'radius',value:.3}]}})).applied,true);assert.equal(JSON.parse(await saved(page)).root.children.find(n=>n.id==='circle').params[0],.3);await page.locator('#undo').click();assert.equal(await saved(page),beforeEdit);
  await openConnection();await page.locator('#language-settings').evaluate(el=>{el.value='zh-CN';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.querySelector('.editor-ai-dialog h2').textContent==='配置 MCP');await page.locator('#language-settings').evaluate(el=>{el.value='en';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.querySelector('.editor-ai-dialog h2').textContent==='Configure MCP');
  assert.ok(!/[\u3400-\u9fff]/.test(await dialog.innerText()));
  assert.ok(!/[\u3400-\u9fff]/.test((await dialog.locator('header').getAttribute('aria-label'))+' '+(await dialog.locator('header').getAttribute('title'))));
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});const box=await dialog.boundingBox();assert.ok(box.width<=width-16);const clipped=await dialog.locator('textarea,button,summary').evaluateAll(elements=>elements.filter(e=>e.checkVisibility()).some(e=>{const r=e.getBoundingClientRect(),d=e.closest('dialog').getBoundingClientRect();return r.left<d.left-1||r.right>d.right+1;}));assert.equal(clipped,false);}
  await dialog.locator('[data-disconnect]').click();await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='false');assert.equal((await data('forge_status')).connected,false);assert.equal((await data('forge_status')).snapshots.length,0);assert.equal((await client.callTool({name:'forge_inspect',arguments:{snapshotId:first.snapshotId}})).isError,true);
  // Two pages and two agents share one endpoint. Closing an agent/page must not
  // disturb the other's page or pinned snapshots. Refresh requires explicit enable.
  await dialog.locator('[data-connect]').click();await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='true');await dialog.locator('[data-close]').click();
  const ownPage=(await data('forge_pages')).pages[0].pageId;
  const otherContext=await browser.newContext(),other=await otherContext.newPage();await isolateService(otherContext);await other.goto(origin+'/');await other.waitForFunction(()=>document.documentElement.dataset.ready==='true');await other.locator('#project-name').fill('Second work');await other.locator('#project-name').press('Tab');
  await other.locator('#ai-tools').click();await other.locator('[data-connection-open]').click();await other.locator('[data-connect]').click();await other.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='true');
  const agentB=new Client({name:'second-agent',version:'1'});await agentB.connect(new StreamableHTTPClientTransport(new URL(configuration.url),{requestInit:{headers:configuration.headers}}));
  const discovered=(await agentB.callTool({name:'forge_pages',arguments:{}})).structuredContent.pages;assert.equal(discovered.length,2);const otherId=discovered.find(p=>p.pageId!==ownPage).pageId;
  const [ours,theirs]=await Promise.all([data('forge_capture',{pageId:ownPage}),agentB.callTool({name:'forge_capture',arguments:{pageId:otherId}},undefined,{timeout:180000})]);assert.equal(theirs.structuredContent.name,'Second work');assert.equal(ours.name,p.name);
  await agentB.close();assert.equal((await data('forge_pages')).pages.length,2);await other.reload();await other.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  await other.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected!=='true');assert.equal((await data('forge_pages')).pages.length,1);assert.equal((await client.callTool({name:'forge_inspect',arguments:{snapshotId:theirs.structuredContent.snapshotId}})).isError,true);
  assert.ok((await data('forge_inspect',{snapshotId:ours.snapshotId})).nodes.length>0);
  await other.locator('#ai-tools').click();await other.locator('[data-connection-open]').click();await other.locator('[data-connect]').click();await other.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='true');assert.equal((await data('forge_pages')).pages.length,2);
  await other.goto('about:blank');await otherContext.close();assert.equal((await data('forge_pages')).pages.length,1);
  // A fresh agent discovers and exports live sketch through the distributed
  // Skill service. Keep this separate from the user's fixture and restore it.
  const liveBefore=await saved(page),liveSnapshot=await data('forge_capture',{pageId:ownPage});
  await data('forge_edit',{snapshotId:liveSnapshot.snapshotId,mode:'create',recipe:{schema:'momo.project-authoring/v1',name:'Live sketch fixture',operations:[{op:'add-node',id:'live-fire',graphic:'TurbulentFlame'},{op:'set-effect',node:'live-fire',effect:'sketch',parameters:{hatchWidth:4.8,roughness:1.3}}]}});
  const live=await data('forge_capture',{pageId:ownPage}),capabilities=await data('forge_deliver',{snapshotId:live.snapshotId,kind:'shader-support'});assert.equal(capabilities.support.recommendedMode,'postprocess');assert.equal(capabilities.support.modes.postprocess.supported,true);
  const delivered=await data('forge_deliver',{snapshotId:live.snapshotId,kind:'shader',shaderMode:'postprocess',times:[0,.75],size:128});assert.equal(delivered.manifest.schema,'momo.handdrawn-postprocess/v1');assert.equal(delivered.manifest.source.snapshotId,live.snapshotId);assert.equal(delivered.manifest.source.archiveSHA256,live.revision);assert.equal(delivered.manifest.displayMaterialProperties.find(p=>p.name==='_Width').floatValue,4.8);assert.equal(delivered.manifest.input.adapter,'generator');assert.equal(delivered.manifest.retired.fallback,false);
  const liveState=await data('forge_editor_state',{pageId:ownPage});await data('forge_history',{snapshotId:live.snapshotId,action:'undo',expectedHistoryRevision:liveState.history.revision});assert.equal(await saved(page),liveBefore);checks.push(mode+': portable Skill discovers and exports live sketch via real MCP; immutable snapshot and native parameter identities');
  await openConnection();await dialog.locator('[data-disconnect]').click();await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='false');
  assert.deepEqual(errors,[]);assert.ok((await readFile(first.sourceProject)).length>0);checks.push(mode+': enable, multi-page/multi-agent isolation, refresh/reconnect, capture native dependencies, inspect, read image/GLSL, render, pin revisions, live schema/catalog/create/edit/sketch, stale rejection, atomic failure, undo/redo, bilingual UI, narrow layout, revoke');await context.close();
 }
 assert.equal(stderr,'');
 const report={ok:true,checks,output:out};await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await client.close();child.kill();await new Promise(done=>child.exitCode!==null?done():child.once('exit',done));server.closeAllConnections();await new Promise(done=>server.close(done));}
