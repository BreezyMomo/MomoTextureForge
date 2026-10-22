import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';

const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const entries=['Circle','Ring','Star'].map((type,i)=>createProjectResource(node('shape',type),{name:'Trial '+i}));
 const original=project();original.name='Original canvas';original.root.children=[node('shape','Circle')];original.canvas.ratio=1.5;original.output.width=300;original.output.height=200;
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({key,marker,text})=>{if(localStorage.getItem('aspect-fixture'))return;localStorage.setItem('aspect-fixture','1');localStorage.setItem(key,text);localStorage.setItem(marker,'1');},{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList(entries)});
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(original)).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const quick=page.locator('#quick-canvas-aspect'),select=quick.locator('select'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));
 const browse=i=>page.locator('#shape-library .tree-pattern-card[data-entry-id="'+entries[i].id+'"]').locator('.component-inspect').click();
 async function ratio(value){await page.waitForFunction(value=>{const c=document.querySelector('#tree-canvas');return Math.abs(c.width/c.height-value)<.025;},value);assert.equal(await select.inputValue(),value===2.5?'current-custom':String(value));}
 async function rename(name){await page.locator('#project-name').fill(name);await page.locator('#project-name').press('Tab');}
 await select.selectOption('4');await ratio(4);const canvas=await saved();
 await browse(0);await ratio(4);assert.deepEqual(await saved(),canvas);const trialName=await page.locator('#project-name').inputValue();await rename('Edited trial');
 await browse(1);await ratio(4);
 await select.selectOption('custom');await quick.getByLabel('宽',{exact:true}).fill('5');await quick.getByLabel('高',{exact:true}).fill('2');await quick.getByRole('button',{name:'应用比例',exact:true}).click();await ratio(2.5);
 assert.equal((await saved()).canvas.ratio,2.5);assert.deepEqual((await saved()).root,canvas.root);assert.deepEqual([(await saved()).output.width,(await saved()).output.height],[300,120]);
 await page.locator('#undo').click();await ratio(4);assert.equal((await saved()).canvas.ratio,4);await page.locator('#redo').click();await ratio(2.5);assert.equal((await saved()).canvas.ratio,2.5);
 await browse(2);await ratio(2.5);await browse(0);await ratio(2.5);assert.equal(await page.locator('#project-name').inputValue(),'Edited trial');
 await page.locator('#undo').click();await ratio(2.5);assert.equal(await page.locator('#project-name').inputValue(),trialName);await page.locator('#redo').click();await ratio(2.5);
 await page.locator('#preview-reset').click();await ratio(2.5);await page.locator('#undo').click();await ratio(2.5);
 await page.locator('#return-work').click();await ratio(2.5);assert.equal(await page.locator('#project-name').inputValue(),original.name);assert.deepEqual((await saved()).root,canvas.root);
 await page.locator('#undo').click();await ratio(2.5);await select.selectOption('2');await ratio(2);await page.locator('#undo').click();await ratio(2.5);await page.locator('#redo').click();await ratio(2);
 await browse(1);await ratio(2);await select.selectOption('0.5');await ratio(.5);await page.locator('#preview-add').click();await ratio(.5);assert.equal((await saved()).root.children.length,2);
 await page.locator('#node-tree .tree-node-name').first().click();await ratio(.5);await browse(0);await ratio(.5);await select.selectOption('8');await ratio(8);assert.equal((await saved()).canvas.ratio,8);assert.equal((await saved()).root.children.length,2);
 await page.evaluate(()=>history.replaceState(null,'',location.pathname));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await ratio(8);assert.equal(await page.locator('#project-name').inputValue(),original.name);assert.equal((await saved()).root.children.length,2);assert.deepEqual(errors,[]);
 console.log({built,pass:true,checks:['new and cached graphics inherit canvas ratio','preview ratio edits persist to canvas without replacing content','stale parameter undo and reset preserve ratio','explicit ratio undo/redo','return, add, node selection and reload preserve ratio'],errors});
}finally{await browser?.close();await new Promise(r=>server.close(r));}
