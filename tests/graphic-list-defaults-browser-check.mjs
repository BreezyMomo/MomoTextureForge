import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {CATALOG} from '../web/catalog.js';
import {createProjectResource} from '../web/project-resources.js';
import {node} from '../web/tree-model.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[],report={};page.on('pageerror',e=>errors.push(e.message));const address='http://127.0.0.1:'+server.address().port,ready=()=>page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.goto(address);await ready();const cards=page.locator('#shape-library .tree-pattern-card');assert.equal(await cards.count(),CATALOG.length);assert.equal(await page.evaluate(k=>localStorage.getItem(k),GRAPHIC_LIST_DEFAULTS_KEY),'1');
 const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).projectResources,GRAPHIC_LIST_KEY),first=await read();await page.reload();await ready();assert.deepEqual((await read()).map(e=>e.id),first.map(e=>e.id));
 // Resizing a floating graphics panel exercises the actual dock panel width.
 await page.getByRole('button',{name:'悬浮图形列表',exact:true}).click();
 const stack=page.locator('.dock-floating').filter({has:page.locator('[data-panel-tab="library"]')}).first();
 // Browser test fixture controls only the panel's width; CSS must choose columns.
 report.columns=[];
 for(const width of [180,290,430,650]){
  await stack.evaluate((e,w)=>{e.style.width=w+'px';e.style.maxWidth='none';e.style.minWidth='0';e.style.left='350px';e.style.top='12px';e.style.height='850px';},width);
  const grid=page.locator('#shape-library .tree-pattern-cards').filter({has:page.locator('.tree-pattern-card')}).first();
  const measured=await grid.evaluate(e=>({width:e.getBoundingClientRect().width,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length,overflow:e.scrollWidth>e.clientWidth+1}));report.columns.push(measured);assert.equal(measured.overflow,false);
 }
 assert.ok(report.columns[0].columns===1);assert.ok(report.columns[1].columns===2);assert.ok(report.columns[2].columns>=3);assert.ok(report.columns[3].columns>=4);
 await page.locator('#shape-library-view').selectOption('list');assert.equal(await page.locator('#shape-library .tree-pattern-cards').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),1);await page.locator('#shape-library-view').selectOption('grid');
 await mkdir('test-results/graphic-list-defaults',{recursive:true});await page.screenshot({path:'test-results/graphic-list-defaults/'+(built?'built':'source')+'.png'});
 const circle=cards.filter({has:page.getByRole('button',{name:'添加 圆形',exact:true})});await circle.locator('summary').click();await circle.getByRole('button',{name:'从图形列表移除',exact:true}).click();const remaining=await read();assert.equal(remaining.length,first.length-1);await page.reload();await ready();assert.equal(await cards.count(),remaining.length);
 // An intentionally empty initialized list stays empty.
 await page.evaluate(([key,text])=>localStorage.setItem(key,text),[GRAPHIC_LIST_KEY,serializeGraphicList([])]);await page.reload();await ready();assert.equal(await cards.count(),0);
 // Existing users receive missing defaults once, without replacing custom work.
 const custom=createProjectResource(node(),{name:'Custom preserved'});custom.root.opacity=.37;
 await page.evaluate(([key,text,marker])=>{localStorage.setItem(key,text);localStorage.removeItem(marker);},[GRAPHIC_LIST_KEY,serializeGraphicList([custom]),GRAPHIC_LIST_DEFAULTS_KEY]);await page.reload();await ready();const migrated=await read();assert.equal(migrated.length,CATALOG.length+1);assert.equal(migrated[0].id,custom.id);assert.equal(migrated[0].root.opacity,.37);
 await page.locator('#language-settings').selectOption('en');const headings=await page.locator('#shape-library>details>summary').allTextContents();assert.ok(headings.filter(t=>/[\u3400-\u9fff]/.test(t)).length<=1,'Only a user-owned category may remain untranslated');
 assert.deepEqual(errors,[]);report.count=first.length;report.checks=['first visit','stable IDs','responsive grid','single-column list','removal stays removed','intentional empty list','existing custom list migration','English categories'];await writeFile('test-results/graphic-list-defaults/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
