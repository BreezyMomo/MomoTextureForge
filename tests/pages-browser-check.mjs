// Run after npm run build:pages. Serve only the built HTML under a Pages-style prefix.
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {BUILTIN} from '../web/definition-runtime.js';

const html=await readFile(new URL('../site/index.html',import.meta.url));
const prefix='/MomoTextureForge/';
const server=http.createServer((request,response)=>{
 const path=new URL(request.url,'http://localhost').pathname;
 if(path!==prefix&&path!==prefix+'index.html'){response.writeHead(404);response.end();return;}
 response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[],workers=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push({url:request.url(),type:request.resourceType()});});
 page.on('worker',worker=>workers.push(worker.url()));
 const address='http://127.0.0.1:'+server.address().port+prefix;
 const ready=async()=>{await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:120000});};
 await page.goto(address);await ready();
 await page.locator('#open-graphics-library').click();
 await page.waitForFunction(count=>document.querySelectorAll('.graphics-card[data-origin="builtin"]').length===count,BUILTIN.catalog.length,{timeout:30000});
 assert.equal(await page.locator('.graphics-card[data-origin="builtin"]').count(),BUILTIN.catalog.length);
 // A new navigation closes the modal while keeping the same hosted path.
 await page.goto(address);await ready();
 await page.locator('#export-now').click();
 const downloadPromise=page.waitForEvent('download',{timeout:120000});
 await page.locator('#confirm-export').click();
 const download=await downloadPromise;
 assert.equal(await download.failure(),null);
 const png=await readFile(await download.path());
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.ok(workers.some(url=>url.startsWith('blob:')),'export must work with the embedded worker');
 await page.goto(address+'?view=examples');await ready();
 assert.equal(await page.locator('a[href]').first().getAttribute('href'),address);
 await page.locator('#generate').click();
 await page.waitForFunction(()=>document.querySelectorAll('#samples article').length>0,null,{timeout:120000});
 const exampleLink=await page.locator('#samples article a').first().getAttribute('href');
 assert.ok(exampleLink.startsWith(address+'#tree='));
 await page.goto(exampleLink);await ready();
 assert.ok(await page.locator('[role="treeitem"]').count()>2);
 await page.goto(address+'?view=validate');await ready();
 assert.equal(await page.locator('a[href]').first().getAttribute('href'),address);
 assert.ok(await page.locator('#composite').count());
 assert.deepEqual(errors,[]);
 assert.ok(requests.every(request=>request.type==='document'&&new URL(request.url).pathname===prefix),JSON.stringify(requests));
 const report={builtins:BUILTIN.catalog.length,views:['editor','examples','validate'],pngExport:png.length,embeddedWorker:true,externalAssets:0,errors};
 await mkdir(new URL('../test-results/pages/',import.meta.url),{recursive:true});
 await writeFile(new URL('../test-results/pages/report.json',import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
