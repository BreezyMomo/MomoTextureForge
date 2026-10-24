import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {decodeZIP} from '../web/resource-zip.js';
import {GENERATOR_EXAMPLE} from '../web/generator-authoring.js';
import {AUTHORING_EXAMPLE} from '../web/ai-authoring.js';
import {RECIPE_SCHEMA,DOCUMENT_SCHEMA} from '../web/project-authoring.js';
import {node} from '../web/tree-model.js';
const root=resolve('.'),out=resolve('test-results/project-authoring');await mkdir(out,{recursive:true});
const portable=await mkdtemp(resolve(out,'portable-'));
for(const [name,data]of await decodeZIP(await readFile('dist/texture-forge-ai-skill.zip'))){const path=resolve(portable,name);await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,data);}
const cli=resolve(portable,'texture-forge-author/scripts/texforge.mjs'),run=async(action,...args)=>{
 const r=await promisify(execFile)(process.execPath,[cli,'project',action,...args],{cwd:portable,timeout:180000,maxBuffer:12*1024*1024,windowsHide:true});const report=JSON.parse(r.stdout);assert.equal(report.ok,true);return report;
};
await run('catalog','--id','Circle','--output',resolve(out,'catalog.json'));
const catalog=JSON.parse(await readFile(resolve(out,'catalog.json'),'utf8')),parameter=catalog.graphics[0].parameters[0].variable;
await run('schema','--output',resolve(out,'schema.json'));
await writeFile(resolve(out,'light.generator.json'),JSON.stringify(GENERATOR_EXAMPLE));await writeFile(resolve(out,'pulse.graphic.json'),JSON.stringify(AUTHORING_EXAMPLE));
await writeFile(resolve(out,'bolt.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#eaffff" d="M72 7 23 72h35l-4 49 51-73H69z"/></svg>');
const arrange=[...node().arrange];arrange[0]=2;arrange[3]=8;arrange[4]=.13;arrange[5]=.39;
const recipe={schema:RECIPE_SCHEMA,name:'Offline energy badge',canvas:{ratio:1.5},output:{seconds:2,exportSeconds:2,width:768,height:512},resources:[{id:'light',file:'light.generator.json'},{id:'bolt',file:'bolt.svg'},{id:'pulse',file:'pulse.graphic.json'}],operations:[
 {op:'add-node',id:'badge',kind:'group',name:'Editable energy badge'},
 {op:'add-node',parent:'badge',id:'glow',graphic:'light',name:'Native RGBA glow',parameters:{radius:.67,softness:.025},values:{color:{mode:'preserve'}}},
 {op:'set-track',node:'glow',parameter:'radius',track:{keys:[[0,.6],[.5,.75],[1,.6]],ease:'smooth'}},
 {op:'add-node',parent:'badge',id:'pulse',graphic:'pulse',name:'Authored breathing ring',values:{color:{mode:'own',high:'#4bffdc'}}},
 {op:'add-node',parent:'badge',id:'stars',graphic:'Star',name:'Orbit stars',values:{arrange,color:{mode:'own',fill:'solid',high:'#b6f8ff'}}},
 {op:'set-track',node:'stars',path:'transform.rotation',track:{keys:[[0,0],[1,90]],ease:'linear'}},
 {op:'add-node',parent:'badge',id:'logo',graphic:'bolt',name:'Vector lightning',values:{transform:{width:.36,height:.6},color:{mode:'preserve'}}},
 {op:'add-node',id:'mask',graphic:'Circle',name:'Editable alpha mask'}, {op:'set-mask',node:'badge',mask:'mask'},
 {op:'set-effect',node:'badge',effect:'bloom',parameters:{strength:.45,radius:12,threshold:.5}},
 {op:'set-effect',node:'badge',effect:'chromatic',parameters:{distance:.6}},
 {op:'reorder-effects',node:'badge',effects:['chromatic','bloom']},
 {op:'add-node',id:'circle',graphic:'Circle',name:'Editable GUI circle',parameters:{[parameter]:.24},values:{transform:{x:.13,y:.2,width:.12,height:.12},color:{mode:'own',fill:'solid',high:'#ffb75c'}}},
]};
const recipeFile=resolve(out,'energy.project.json'),file=resolve(out,'energy.project.zip');await writeFile(recipeFile,JSON.stringify(recipe,null,2));
const created=await run('create',recipeFile,'--output',file);assert.equal(created.validation.editorRendering,'passed');assert.equal(created.imported.length,3);
await run('inspect',file,'--time','1','--output',resolve(out,'brief.json'));let brief=JSON.parse(await readFile(resolve(out,'brief.json'),'utf8'));
assert.ok(brief.resources.some(r=>r.kind==='generator'));assert.ok(brief.resources.some(r=>r.kind==='image'));assert.ok(brief.nodes.some(n=>n.id==='mask'));assert.equal(brief.nodes.find(n=>n.id==='glow').parameters.find(p=>p.variable==='radius').samples[0].value,.75);
await run('check',file,'--times','0,0.5,1,1.5','--size','192','--output',resolve(out,'previews'));
const docFile=resolve(out,'energy.document.json');await run('unpack',file,'--output',docFile);const document=JSON.parse(await readFile(docFile,'utf8'));assert.equal(document.schema,DOCUMENT_SCHEMA);assert.ok(document.assets.every(([id])=>typeof id==='string'));assert.equal(document.project.root.children[0].mask.id,'mask');
// Editing actual embedded source and metadata changes hashes, while the canonical
// packer updates every graphic/density reference and retains editable tree data.
const formula=document.assets.find(([,a])=>a.definition.name===AUTHORING_EXAMPLE.name);formula[1].definition.aliases={...(formula[1].definition.aliases??{}),en:'Offline edited pulse'};formula[1].definition.outputs.scalar.inline=formula[1].definition.outputs.scalar.inline.replace('sin(', 'cos(');
const editedDoc=resolve(out,'edited.document.json');await writeFile(editedDoc,JSON.stringify(document));const repacked=resolve(out,'repacked.zip');await run('pack',editedDoc,'--output',repacked);
const ops=resolve(out,'changes.json');await writeFile(ops,JSON.stringify({schema:RECIPE_SCHEMA,operations:[{op:'set-parameter',node:'circle',parameter,value:.32},{op:'duplicate-node',node:'logo',id:'second-logo',parent:'@root',name:'Second vector'},{op:'patch-node',node:'second-logo',values:{opacity:.4,transform:{x:.84,y:.8,width:.15,height:.25}}}]}));
const edited=resolve(out,'edited.zip');await run('edit',repacked,'--operations',ops,'--output',edited);await run('inspect',edited,'--output',resolve(out,'edited-brief.json'));brief=JSON.parse(await readFile(resolve(out,'edited-brief.json'),'utf8'));assert.ok(brief.resources.some(r=>r.definition.aliases?.en==='Offline edited pulse'));assert.ok(brief.nodes.some(n=>n.id==='second-logo'));
const componentRecipe=resolve(out,'component.json');await writeFile(componentRecipe,JSON.stringify({schema:RECIPE_SCHEMA,resources:[{id:'previous',file:'energy.project.zip'}],operations:[{op:'add-component',id:'reused',resource:'previous'}]}));const component=resolve(out,'component.zip');await run('create',componentRecipe,'--output',component);
await run('catalog','--from',component,'--output',resolve(out,'imported-catalog.json'));assert.equal(JSON.parse(await readFile(resolve(out,'imported-catalog.json'),'utf8')).components[0].root.children[0].children.length,2);
await writeFile(resolve(out,'bad.json'),JSON.stringify({schema:RECIPE_SCHEMA,operations:[{op:'set-parameter',node:'circle',parameter:'wrong-variable',value:0}]}));let failed=false;const bad=resolve(out,'failed.zip');try{await run('edit',edited,'--operations',resolve(out,'bad.json'),'--output',bad);}catch{failed=true;}assert.equal(failed,true);assert.equal(JSON.parse(await readFile(resolve(out,'failed.report.json'),'utf8')).ok,false);

const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(root,pathname==='/built.html'?'site/index.html':'web/'+(pathname==='/'?'index.html':decodeURIComponent(pathname).slice(1)));if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;let browser;const gui=[];
try{
 browser=await chromium.launch({headless:true});
 for(const built of process.argv.includes('--built')?[false,true]:[false]){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>route.request().url().startsWith(origin+'/')||/^(data|blob):/.test(route.request().url())?route.continue():route.abort());
  await page.goto(origin+(built?'/built.html':'/'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  await page.locator('#project-file').setInputFiles({name:'energy.zip',mimeType:'application/zip',buffer:await readFile(edited)});
  await page.waitForFunction(()=>document.querySelector('#node-tree [data-node-id="circle"]'));
  await page.locator('#node-tree [data-node-id="circle"] .tree-node-name').first().click();
  // A real inspector control edit, followed by the editor's own File > Save.
  await page.locator('#language-settings').selectOption('en');
  const shapeTab=page.locator('#inspector-tabs').getByRole('button',{name:'Shape',exact:true});await shapeTab.click();
  const input=page.locator('#inspector input[type="number"][data-animation-path="params.0"]');
  await input.fill('.42');await input.press('Tab');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')).root.children.find(n=>n.id==='circle').params[0]===.42);
  const downloaded=page.waitForEvent('download');await page.locator('#save-project').evaluate(el=>el.click());const download=await downloaded,saved=resolve(out,built?'gui-static.zip':'gui-source.zip');await download.saveAs(saved);
  await run('inspect',saved,'--time','1','--output',resolve(out,built?'gui-static.json':'gui-source.json'));
  const b=JSON.parse(await readFile(resolve(out,built?'gui-static.json':'gui-source.json'),'utf8'));assert.equal(b.nodes.find(n=>n.id==='circle').base.params[0],.42);assert.ok(b.resources.some(r=>r.kind==='generator'));assert.ok(b.resources.some(r=>r.kind==='image'));assert.deepEqual(b.nodes.find(n=>n.id==='badge').effects.map(e=>e.id),['chromatic','bloom']);
  await run('render',saved,'--size','192','--time','1','--output',resolve(out,built?'gui-static.png':'gui-source.png'));
  assert.deepEqual(errors,[]);gui.push(built?'static editor':'source editor');await page.close();
 }
}finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
const report={ok:true,checks:['extracted standalone Skill without source checkout','live catalog/schema','native project creation','custom formula/generator/SVG dependencies','time samples and frame rendering','editable JSON with embedded source and stable density references','canonical ZIP packing with content hash remapping','offline project editing','reuse whole project as editable component','failure report',...gui.map(s=>s+' opens ZIP, edits inspector, saves ZIP and CLI reads/renders it')],output:out};await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
