import {withPagesAssets} from './helpers/pages-assets.mjs';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,sanitizeTree} from '../web/tree-model.js';
import {restoreLocalProject} from '../web/project-dependencies.js';
import {createProjectResource} from '../web/project-resources.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';

const built=process.argv.includes('--built'),root=resolve('web');
const server=createServer(withPagesAssets(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://local').pathname,file=pathname==='/built.html'?resolve('site/index.html'):resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(pathname!=='/built.html'&&!file.startsWith(root+sep))throw Error();
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}}));
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[],origin='http://127.0.0.1:'+server.address().port;
 page.on('pageerror',e=>errors.push(e.message));const editor=origin+(built?'/built.html':'/');
 await page.goto(origin+(built?'/built.html?view=examples&category=composition':'/examples.html?category=composition'));
 const fixtures=[];
 for(const name of ['手绘心形','手绘样式对照']){
  const card=page.locator('#samples article').filter({has:page.getByRole('heading',{name,exact:true})});await card.locator('a').waitFor({state:'attached',timeout:120000});
  const href=await card.locator('a').getAttribute('href'),payload=JSON.parse(Buffer.from(new URL(href).hash.slice(6),'base64').toString('utf8'));assert.equal(payload.output.alpha,true,name+' editor link must retain alpha');
  const corner=await card.locator('img').evaluate(async img=>{await img.decode();const c=document.createElement('canvas');c.width=c.height=1;c.getContext('2d').drawImage(img,0,0);return [...c.getContext('2d').getImageData(0,0,1,1).data];});assert.deepEqual(corner,[255,255,255,255],name+' thumbnail stays white');fixtures.push({name,href,payload});
 }
 const corner=()=>page.evaluate(()=>{const c=document.querySelector('#tree-canvas');return [...c.getContext('2d').getImageData(0,0,1,1).data];});
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const clear=()=>page.waitForFunction(()=>{const c=document.querySelector('#tree-canvas');return c?.width>0&&c.getContext('2d').getImageData(0,0,1,1).data[3]===0;});
 for(const f of fixtures){await page.goto(f.href);await ready();await clear();assert.equal(await page.locator('#background').inputValue(),'transparent');}
 // Reproduce an older white-output project and verify its existing recovery control.
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1'))).then(p=>p?restoreLocalProject(p):null);
 const legacy=structuredClone(fixtures[0].payload);legacy.output.alpha=false;legacy.output.background='#ffffff';
 await page.goto('about:blank');await page.goto(editor+'#tree='+Buffer.from(JSON.stringify(legacy)).toString('base64'));await ready();await page.waitForFunction(()=>{const c=document.querySelector('#tree-canvas');return c?.width>0&&c.getContext('2d').getImageData(0,0,1,1).data[3]===255;});assert.deepEqual(await corner(),[255,255,255,255]);const loadedRoot=sanitizeTree(legacy).root;
 await page.locator('#canvas-display-menu>summary').click();assert.equal(await page.locator('#background').inputValue(),'solid');await page.locator('#background').selectOption('transparent');await clear();assert.equal((await saved()).output.alpha,true);assert.deepEqual((await saved()).root,loadedRoot);
 // Insert the editable subtree into an existing target; output settings belong to the target.
 const entry=createProjectResource(fixtures[0].payload.root.children[0],{name:'Heart component'}),target=project();target.root.children=[];target.name='Target';target.canvas.ratio=2;Object.assign(target.output,{width:240,height:120,alpha:true,background:'#164376'});
 await page.evaluate(({key,marker,text})=>{localStorage.setItem(key,text);localStorage.setItem(marker,'1');},{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList([entry])});
 await page.goto('about:blank');await page.goto(editor+'#tree='+Buffer.from(JSON.stringify(target)).toString('base64'));await ready();const before=sanitizeTree(target);
 await page.locator('#shape-library [data-entry-id="'+entry.id+'"]').locator('.component-inspect').click();await page.locator('#preview-add').click();await clear();const after=await saved();assert.equal(after.root.children.length,1);assert.deepEqual(after.output,before.output);assert.deepEqual(after.canvas,before.canvas);assert.equal(after.root.children[0].postEffects.sketch.enabled,true);
 assert.deepEqual(errors,[]);const report={built,whiteThumbnails:true,transparentEditorLinks:true,oldWhiteBackgroundReproduced:true,transparentOutputClearsIt:true,componentPreservesTarget:true,errors};await mkdir('test-results/sketch-example-background',{recursive:true});await writeFile('test-results/sketch-example-background/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
