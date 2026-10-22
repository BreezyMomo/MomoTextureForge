// Merge regression: pinned controls and movable curves follow editor appearance.
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+(new URL(req.url,'http://local').pathname==='/'?'/index.html':new URL(req.url,'http://local').pathname));if(!file.startsWith(root))throw Error();res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1050},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const p=project();p.root.children=[node('shape','Circle')];p.output.width=p.output.height=128;
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#language-settings').selectOption('en');await page.locator('#node-tree .tree-node-name').click();
 const module=key=>page.locator('#inspector>[data-module="'+key+'"]'),snapshot=()=>page.evaluate(()=>({draft:localStorage.getItem('momo-texture-tree:draft:v1'),hash:location.hash,undo:document.querySelector('#undo').disabled}));
 for(const key of ['editor.opacity','curves.title'])await module(key).locator(':scope>summary .module-pin').click();
 const sameToken=async(selector,property,token)=>assert.equal(await page.locator(selector).evaluate((e,{property,token})=>{const probe=document.createElement('span');probe.style[property]='var('+token+')';e.append(probe);const expected=getComputedStyle(probe)[property],actual=getComputedStyle(e)[property];probe.remove();return actual===expected;},{property,token}),true,selector+' follows '+token);
 for(const theme of ['light','graphite','classic']){
  const before=await snapshot();await page.locator('#appearance-settings').click();await page.locator('#appearance-theme').selectOption(theme);await page.locator('.appearance-dialog [data-save]').click();
  await sameToken('.node-shortcuts','backgroundColor','--ui-inset');await sameToken('#inspector>[data-module="editor.opacity"]>summary .module-pin','color','--ui-accent-text');
  await module('editor.opacity').locator('.shortcut-scope').click();await sameToken('.shortcut-scope-menu','backgroundColor','--ui-panel');await sameToken('.shortcut-scope-menu','color','--ui-text');await page.keyboard.press('Escape');
  await page.locator('.node-shortcuts').getByRole('button',{name:'Edit curves',exact:true}).click();await sameToken('.node-curves-dialog','backgroundColor','--ui-panel');await sameToken('.node-curves-dialog','color','--ui-text');
  const header=page.locator('.node-curves-dialog>header');await header.focus();const box=await header.boundingBox();await page.keyboard.press('ArrowLeft');assert.ok(Math.abs((await header.boundingBox()).x-box.x+8)<1);await page.keyboard.press('Escape');assert.deepEqual(await snapshot(),before);
 }
 const shortcut=page.locator('.node-shortcut[data-shortcut="editor.opacity"]');await shortcut.getByRole('spinbutton',{name:'Opacity',exact:true}).fill('.46');await shortcut.getByRole('spinbutton',{name:'Opacity',exact:true}).press('Tab');assert.equal(await module('editor.opacity').getByRole('spinbutton',{name:'Opacity',exact:true}).inputValue(),'0.46');await page.locator('#undo').click();assert.equal(await shortcut.getByRole('spinbutton',{name:'Opacity',exact:true}).inputValue(),'1');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({built,pass:true,themes:3,shortcuts:true,scopeMenu:true,movableCurves:true,appearanceIsolation:true,editingAndUndo:true}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
