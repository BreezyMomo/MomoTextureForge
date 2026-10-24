import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';

const built=process.argv.includes('--built'),root=resolve('web');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=name==='/built.html'?resolve('site/index.html'):resolve(root,'.'+(name==='/'?'/index.html':name));if(name!=='/built.html'&&!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[],origin='http://127.0.0.1:'+server.address().port,editor=origin+(built?'/built.html':'/');page.on('pageerror',e=>errors.push(e.message));
 const entries=['Circle','Ring'].map((type,i)=>createProjectResource(node('shape',type),{name:'Trial '+i})),p=project();p.root.children=[];p.name='Background test';Object.assign(p.output,{width:64,height:64,alpha:false,background:'#ffffff'});
 await page.addInitScript(({key,marker,text})=>{if(!localStorage.getItem('background-fixture')){localStorage.setItem(key,text);localStorage.setItem(marker,'1');localStorage.setItem('background-fixture','1');}},{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList(entries)});
 await page.goto(editor+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await ready();
 const mode=page.locator('#background'),color=page.locator('#canvas-background-color'),menu=page.locator('#canvas-display-menu'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));
 const open=async()=>{if(await menu.getAttribute('open')===null)await menu.locator(':scope>summary').click();};
 const pixel=expected=>page.waitForFunction(expected=>{const c=document.querySelector('#tree-canvas');if(!c?.width)return false;const data=c.getContext('2d').getImageData(0,0,1,1).data;return data.every((v,i)=>Math.abs(v-expected[i])<=1);},expected);
 await pixel([255,255,255,255]);await open();assert.equal(await mode.inputValue(),'solid');assert.equal(await color.inputValue(),'#ffffff');assert.equal(await mode.getAttribute('aria-label'),'画布背景');
 await mode.selectOption('transparent');await pixel([0,0,0,0]);assert.equal((await saved()).output.alpha,true);assert.equal(await color.isVisible(),false);
 await page.locator('#undo').click();await pixel([255,255,255,255]);assert.equal(await mode.inputValue(),'solid');await page.locator('#redo').click();await pixel([0,0,0,0]);
 await open();await mode.selectOption('solid');await color.evaluate(e=>{for(const value of ['#112233','#123456']){e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}e.dispatchEvent(new Event('change',{bubbles:true}));});await pixel([18,52,86,255]);assert.equal((await saved()).output.background,'#123456');
 // A native color drag is one undo step, including its preview events.
 await page.locator('#undo').click();assert.equal((await saved()).output.background,'#ffffff');await page.locator('#redo').click();await pixel([18,52,86,255]);assert.equal(await color.inputValue(),'#123456');
 await page.locator('#project-settings').click();assert.equal(await page.locator('#global-controls input[type=color]').count(),0);assert.equal(await page.locator('#global-controls').getByRole('checkbox',{name:'透明背景',exact:true}).count(),0);await page.locator('#close-global').click();
 async function exportPixel(expected){
  await page.locator('#export-now').click();assert.equal(await page.locator('#global-controls input[type=color]').count(),0);await page.locator('#global-controls select').first().selectOption('png');
  const wait=page.waitForEvent('download',{timeout:120000});const locked=await page.locator('#confirm-export').evaluate(e=>{e.click();return [document.querySelector('#background').disabled,document.querySelector('#canvas-background-color').disabled];});assert.deepEqual(locked,[true,true]);const bytes=await readFile(await (await wait).path());
  const rgba=await page.evaluate(async bytes=>{const image=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);image.close();return [...c.getContext('2d').getImageData(0,0,1,1).data];},[...bytes]);assert.deepEqual(rgba,expected);await page.locator('#close-global').click();
 }
 await exportPixel([18,52,86,255]);await open();await mode.selectOption('transparent');await exportPixel([0,0,0,0]);await open();await mode.selectOption('solid');
 // The actual project ZIP restores the shared background; no new schema fields.
 await page.locator('#header-file-menu>summary').click();const saving=page.waitForEvent('download');await page.locator('#save-project').click();const projectPath=await (await saving).path();await open();await mode.selectOption('transparent');await page.locator('#project-file').setInputFiles({name:'background.zip',mimeType:'application/zip',buffer:await readFile(projectPath)});await pixel([18,52,86,255]);assert.equal(await mode.inputValue(),'solid');assert.equal((await saved()).output.background,'#123456');
 const browse=async i=>{await page.locator('#shape-library .tree-pattern-card[data-entry-id="'+entries[i].id+'"]').locator('.component-inspect').click();};
 await browse(0);await page.locator('#project-name').fill('Edited trial');await page.locator('#project-name').press('Tab');await page.locator('#return-work').click();await open();await page.getByRole('button',{name:'使用黑色画布背景',exact:true}).click();await pixel([0,0,0,255]);
 await browse(0);await page.locator('#undo').click();await pixel([0,0,0,255]);assert.equal(await color.inputValue(),'#000000');await page.locator('#resource-actions-menu>summary').click();await page.locator('#preview-reset').click();await pixel([0,0,0,255]);await browse(1);assert.equal(await mode.inputValue(),'solid');
 // Editing this global background during a resource trial reaches the owning canvas.
 await open();await mode.selectOption('transparent');assert.equal((await saved()).output.alpha,true);await page.locator('#preview-add').click();assert.equal((await saved()).root.children.length,1);await pixel([0,0,0,0]);assert.equal((await saved()).output.background,'#000000');
 await open();await mode.selectOption('solid');await page.getByRole('button',{name:'使用白色画布背景',exact:true}).click();await pixel([255,255,255,255]);const beforeLanguage=await saved();await page.locator('#language-settings').selectOption('en');assert.deepEqual(await saved(),beforeLanguage);assert.equal(await mode.getAttribute('aria-label'),'Canvas background');
 await page.setViewportSize({width:768,height:1050});await open();const pane=await page.locator('.tree-preview').boundingBox(),box=await menu.locator('.canvas-dropdown-panel').boundingBox();assert.ok(box.x>=pane.x-1&&box.x+box.width<=pane.x+pane.width+1,JSON.stringify({pane,box}));
 await page.evaluate(()=>history.replaceState(null,'',location.pathname));await page.reload();await ready();await pixel([255,255,255,255]);assert.equal(await mode.inputValue(),'solid');assert.equal((await saved()).output.background,'#ffffff');assert.equal((await saved()).root.children.length,1);assert.deepEqual(errors,[]);
 const report={built,legacyOutput:true,previewMatchesPNG:true,gestureUndo:true,projectZIPRestore:true,componentPreservesCanvas:true,cachedTrialUndo:true,persistence:true,language:true,narrow:true,errors};await mkdir('test-results/canvas-background',{recursive:true});await writeFile('test-results/canvas-background/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
