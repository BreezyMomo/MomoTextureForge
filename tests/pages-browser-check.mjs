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
 assert.equal(await page.locator('[role="treeitem"]').count(),0,'first visit starts with an empty canvas');
 await page.locator('#open-graphics-library').click();
 await page.waitForFunction(count=>document.querySelectorAll('.graphics-card[data-origin="builtin"]').length===count,BUILTIN.catalog.length,{timeout:30000});
 assert.equal(await page.locator('.graphics-card[data-origin="builtin"]').count(),BUILTIN.catalog.length);
 await page.getByPlaceholder('搜索名称、分类或标签').fill('湍流火焰');
 await page.getByRole('button',{name:'编辑 湍流火焰',exact:true}).click();
 const generatorDialog=page.locator('dialog.graphic-editor-dialog');await generatorDialog.getByRole('status').filter({hasText:'预览成功'}).waitFor();
 const generatorColors=await generatorDialog.locator('canvas').evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let colors=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>8&&data[i]>data[i+2]+20)colors++;return colors;});assert.ok(generatorColors>0,'embedded generator retains fire colors');
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
 const exampleNodes=await page.locator('[role="treeitem"]').count();assert.ok(exampleNodes>2);
 await page.locator('details.header-dropdown > summary').filter({hasText:'文件'}).click();
 await page.locator('#new-project').click();
 assert.equal(await page.locator('[role="treeitem"]').count(),0,'new project has no default shape');
 await page.locator('#undo').click();
 assert.equal(await page.locator('[role="treeitem"]').count(),exampleNodes,'undo restores the previous artwork');
 await page.locator('#redo').click();
 assert.equal(await page.locator('[role="treeitem"]').count(),0);
 await page.goto(address);await ready();
 assert.equal(await page.locator('[role="treeitem"]').count(),0,'empty draft stays empty after reopening');
 await page.locator('#add-group').click();
 assert.equal(await page.locator('[role="treeitem"]').count(),1,'nodes can still be added to an empty project');
 await page.goto(address+'?view=validate');await ready();
 assert.equal(await page.locator('a[href]').first().getAttribute('href'),address);
 assert.ok(await page.locator('#composite').count());
 assert.deepEqual(errors,[]);
 assert.ok(requests.every(request=>request.type==='document'&&new URL(request.url).pathname===prefix),JSON.stringify(requests));
 const report={builtins:BUILTIN.catalog.length,views:['editor','examples','validate'],emptyNewProject:true,undoNewProject:true,pngExport:png.length,embeddedWorker:true,embeddedGenerator:true,generatorColors,externalAssets:0,errors};
 await mkdir(new URL('../test-results/pages/',import.meta.url),{recursive:true});
 await writeFile(new URL('../test-results/pages/report.json',import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
