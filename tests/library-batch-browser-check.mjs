import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {CATALOG} from '../web/catalog.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[],report={};page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,marker,empty})=>{
  if(!localStorage.getItem(marker)){localStorage.setItem(marker,'1');localStorage.setItem(key,empty);}
  const set=Storage.prototype.setItem;window.batchWrites=0;Storage.prototype.setItem=function(k,v){if(k===key)window.batchWrites++;return set.call(this,k,v);};
  window.batchBeats=0;setInterval(()=>{if(document.querySelector('.graphics-batch-progress:not([hidden])'))window.batchBeats++;},16);
 },{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,empty:serializeGraphicList([])});
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.ready==='true'),read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).projectResources,GRAPHIC_LIST_KEY);
 await page.goto('http://127.0.0.1:'+server.address().port);await ready();await page.evaluate(()=>window.batchWrites=0);
 const dialog=page.locator('.graphics-library-dialog'),progress=dialog.locator('.graphics-batch-progress'),batch=dialog.getByRole('button',{name:/添加选中资源|Add selected resources/});
 const open=async()=>{await page.locator('#open-graphics-library').click();await dialog.locator('.graphics-card').first().waitFor();};
 const select=()=>dialog.getByRole('button',{name:/全选当前结果|Select all results/,exact:true}).click();
 const finished=async()=>{await progress.waitFor({state:'hidden'});await page.waitForFunction(()=>!document.querySelector('.graphics-library-dialog .graphics-actions').inert);};
 await open();await select();await batch.click();await progress.waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('.graphics-batch-progress progress')?.value>=5);
 assert.ok((await progress.locator('.graphics-batch-name').textContent()).length>0);
 // Cancel at the observed progress point; capturing a screenshot first can let a fast batch finish.
 await progress.getByRole('button',{name:'取消',exact:true}).evaluate(button=>button.click());await finished();
 await mkdir('test-results/library-batch',{recursive:true});await page.screenshot({path:'test-results/library-batch/'+(built?'built':'source')+'-canceled.png'});
 report.canceledCount=(await read()).length;assert.ok(report.canceledCount>0&&report.canceledCount<CATALOG.length);assert.ok((await dialog.locator('.graphics-body>p[role=status]').textContent()).includes('已取消'));
 assert.equal(await page.evaluate(()=>window.batchWrites),1);
 await batch.click();await finished();assert.equal((await read()).length,CATALOG.length);assert.equal(await page.evaluate(()=>window.batchWrites),2);
 // Existing selections are skipped without another save.
 await select();await batch.click();await finished();assert.equal(await page.evaluate(()=>window.batchWrites),2);
 report.responsiveFrames=await page.evaluate(()=>window.batchBeats);assert.ok(report.responsiveFrames>10);
 await dialog.locator('.graphics-close').click();await page.locator('#undo').click();assert.equal((await read()).length,report.canceledCount);await page.locator('#undo').click();assert.equal((await read()).length,0);
 await page.reload();await ready();assert.equal((await read()).length,0);
 await page.evaluate(()=>window.batchWrites=0);await page.locator('#language-settings').selectOption('en');await open();await select();await batch.click();await progress.waitFor({state:'visible'});
 assert.match(await progress.textContent(),/Processing \d+ \/ 298/);await finished();assert.equal((await read()).length,CATALOG.length);assert.equal(await page.evaluate(()=>window.batchWrites),1);
 await dialog.locator('.graphics-close').click();await page.reload();await ready();assert.equal((await read()).length,CATALOG.length);
 assert.deepEqual(errors,[]);report.checks=['298-item progress and responsive frames','cancel preserves prefix','retry adds remaining','one save per batch','duplicate selection skips without saving','one undo per batch','English progress','reload persists'];await writeFile('test-results/library-batch/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
