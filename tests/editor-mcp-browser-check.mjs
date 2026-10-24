import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {chromium} from 'playwright';
import {decodeZIP} from '../web/resource-zip.js';
import {encodeResourcePack,imageAsset} from '../web/resource-pack.js';
import {encodePNG} from '../web/encoders.js';
import {registerAsset,unregisterAsset,contentHash} from '../web/resource-assets.js';
import {assetFromGeneratorAuthoring,GENERATOR_EXAMPLE} from '../web/generator-authoring.js';
import {node,project} from '../web/tree-model.js';

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
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(root,pathname==='/built.html'?'site/index.html':'web/'+(pathname==='/'?'index.html':decodeURIComponent(pathname).slice(1)));if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
const reserve=createServer();await new Promise(done=>reserve.listen(0,'127.0.0.1',done));const port=reserve.address().port;await new Promise(done=>reserve.close(done));
const client=new Client({name:'texture-forge-regression',version:'1.0.0'},{capabilities:{}}),transport=new StdioClientTransport({command:process.execPath,args:[cli,'mcp','--port',String(port),'--output-dir',resolve(out,'snapshots')],cwd:portable,stderr:'pipe'});let stderr='';transport.stderr?.on('data',b=>stderr+=b);let browser;
const call=async(name,args={})=>{const result=await client.callTool({name,arguments:args},undefined,{timeout:180000});assert.ok(!result.isError,name+': '+result.content?.[0]?.text);return result;};
const data=async(name,args)=>(await call(name,args)).structuredContent;
const saved=page=>page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1'));
const checks=[];
try{
 await client.connect(transport);const tools=(await client.listTools()).tools;assert.deepEqual(tools.map(t=>t.name).sort(),['forge_capture','forge_connect','forge_disconnect','forge_guide','forge_inspect','forge_render','forge_resource','forge_status'].sort());
 assert.ok((await call('forge_guide',{topic:'live',language:'en'})).content[0].text.includes('forge_capture'));checks.push('real SDK stdio initialization, discovery and bundled guide');
 browser=await chromium.launch({headless:true});
 for(const mode of process.argv.includes('--built')?['source','built','https']:['source']){
  console.log('Checking '+mode+' editor');const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  if(mode==='https'){
   await context.grantPermissions(['local-network-access'],{origin:'https://breezymomo.github.io'});
   await page.route('https://breezymomo.github.io/MomoTextureForge/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/MomoTextureForge/'||url.pathname==='/MomoTextureForge/index.html')await route.fulfill({contentType:'text/html',body:await readFile('site/index.html','utf8')});else await route.abort();});
  }
  await page.goto(mode==='https'?'https://breezymomo.github.io/MomoTextureForge/':origin+(mode==='built'?'/built.html':'/'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  await page.locator('#project-file').setInputFiles({name:'Current work.zip',mimeType:'application/zip',buffer:Buffer.from(fixture)});await page.waitForFunction(()=>document.querySelector('#node-tree [data-node-id="heart"]'));
  await page.locator('#language-settings').selectOption('en');const baseline=await saved(page),pair=await data('forge_connect');assert.equal((await data('forge_status')).snapshots.length,0);
  const openConnection=async()=>{await page.locator('#ai-tools').click();await page.locator('.ai-tools-dialog [data-tab=work]').click();await page.locator('.ai-tools-dialog [data-connection-open]').click();};
  await openConnection();const dialog=page.locator('.editor-ai-dialog');await dialog.locator('input').fill('bad-code');await dialog.getByRole('button',{name:'Connect',exact:true}).click();assert.match(await dialog.locator('[role=alert]').innerText(),/Invalid pairing code/);
  // Closing the panel while pairing must keep the connection and avoid a stale DOM callback.
  let releasePair,pairStarted;const heldPair=new Promise(done=>releasePair=done),started=new Promise(done=>pairStarted=done),pairURL='http://127.0.0.1:'+port+'/pair';
  await page.route(pairURL,async route=>{if(route.request().method()==='OPTIONS'){await route.continue();return;}const response=await route.fetch();pairStarted();await heldPair;await route.fulfill({response});});
  await dialog.locator('input').fill(pair.pairingCode);await dialog.getByRole('button',{name:'Connect',exact:true}).click();await started;await dialog.getByRole('button',{name:'Close',exact:true}).click();releasePair();
  await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='true');await page.unroute(pairURL);assert.equal((await data('forge_status')).connected,true);
  await openConnection();assert.equal(await dialog.locator('input').inputValue(),'');await dialog.getByRole('button',{name:'Close',exact:true}).click();
  const first=await data('forge_capture');assert.equal(first.name,p.name);assert.equal(first.cycleSeconds,2);assert.equal(first.revision,createHash('sha256').update(await readFile(first.sourceProject)).digest('hex'));assert.equal(await saved(page),baseline);
  const summary=await data('forge_inspect',{snapshotId:first.snapshotId});assert.ok(summary.nodes.some(n=>n.id==='mask'));assert.ok(summary.resources.some(r=>r.kind==='generator'));assert.ok(summary.resources.some(r=>r.kind==='image'));
  const detail=await data('forge_inspect',{snapshotId:first.snapshotId,nodeId:'heart',times:[1]});assert.equal(detail.node.samples[0].opacity,.75);assert.equal(detail.node.effects[0].id,'sketch');
  const imageResource=summary.resources.find(r=>r.kind==='image'),readImage=await call('forge_resource',{snapshotId:first.snapshotId,resourceId:imageResource.id});assert.ok(readImage.content.some(c=>c.type==='image'));assert.deepEqual(await readFile(readImage.structuredContent.asset.imageFile),Buffer.from(png));
  const genResource=summary.resources.find(r=>r.kind==='generator'),readGenerator=await data('forge_resource',{snapshotId:first.snapshotId,resourceId:genResource.id});assert.ok(readGenerator.asset.libraries['generator-pass-0'].includes('generate'));
  const render=await call('forge_render',{snapshotId:first.snapshotId,nodeId:'heart',beforeEffect:'sketch',channel:'alpha',times:[0,1],size:96});assert.equal(render.structuredContent.width,96);assert.equal(render.structuredContent.height,64);assert.ok(render.content.some(c=>c.type==='image'));assert.equal(render.structuredContent.verification.editorRendering,'passed');
  await page.locator('#node-tree [data-node-id="circle"] .tree-node-name').first().click();await page.locator('#inspector-tabs').getByRole('button',{name:'Shape',exact:true}).click();const radius=page.locator('#inspector input[type=number][data-animation-path="params.0"]');await radius.fill('.42');await radius.press('Tab');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')).root.children.find(n=>n.id==='circle').params[0]===.42);
  const second=await data('forge_capture');assert.notEqual(first.revision,second.revision);assert.equal((await data('forge_inspect',{snapshotId:first.snapshotId,nodeId:'circle'})).node.base.params[0],.24);assert.equal((await data('forge_inspect',{snapshotId:second.snapshotId,nodeId:'circle'})).node.base.params[0],.42);
  await openConnection();await page.locator('#language-settings').evaluate(el=>{el.value='zh-CN';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.querySelector('.editor-ai-dialog h2').textContent==='与 AI 共享当前作品');await page.locator('#language-settings').evaluate(el=>{el.value='en';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.querySelector('.editor-ai-dialog h2').textContent==='Share the current work with AI');
  assert.ok(!/[\u3400-\u9fff]/.test(await dialog.innerText()));
  assert.ok(!/[\u3400-\u9fff]/.test((await dialog.locator('header').getAttribute('aria-label'))+' '+(await dialog.locator('header').getAttribute('title'))));
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});const box=await dialog.boundingBox();assert.ok(box.width<=width-16);const clipped=await dialog.locator('input,button,summary').evaluateAll(elements=>elements.filter(e=>e.checkVisibility()).some(e=>{const r=e.getBoundingClientRect(),d=e.closest('dialog').getBoundingClientRect();return r.left<d.left-1||r.right>d.right+1;}));assert.equal(clipped,false);}
  await dialog.getByRole('button',{name:'Disconnect',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#ai-tools').dataset.connected==='false');assert.equal((await data('forge_status')).connected,false);assert.equal((await data('forge_status')).snapshots.length,0);assert.equal((await client.callTool({name:'forge_inspect',arguments:{snapshotId:first.snapshotId}})).isError,true);
  assert.deepEqual(errors,[]);assert.ok((await readFile(first.sourceProject)).length>0);checks.push(mode+': pair, capture native dependencies, inspect, read image/GLSL, render, pin revisions, bilingual UI, narrow layout, revoke');await context.close();
 }
 assert.equal(stderr,'');
 const report={ok:true,checks,output:out};await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await client.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
