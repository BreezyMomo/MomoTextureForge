import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Hold only the thumbnail idle queue so pending previews can be inspected.
 await page.addInitScript(()=>{window.thumbnailIdle=[];window.requestIdleCallback=callback=>{window.thumbnailIdle.push(callback);return window.thumbnailIdle.length;};});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true'&&window.thumbnailIdle.length>0);
 const frames=page.locator('#shape-library .tree-thumbnail-preview'),first=frames.first(),firstImage=first.locator('img');
 assert.equal(await first.getAttribute('data-state'),'loading');assert.equal(await first.getAttribute('aria-busy'),'true');assert.match(await first.getAttribute('aria-label'),/加载中/);
 assert.equal(await firstImage.evaluate(e=>getComputedStyle(e).opacity),'0');assert.notEqual(await first.locator('.tree-thumbnail-indicator').evaluate(e=>getComputedStyle(e).display),'none');
 await mkdir('test-results/thumbnail-loading',{recursive:true});await page.screenshot({path:'test-results/thumbnail-loading/'+(built?'built':'source')+'-loading.png'});
 // A pending preview detached by filtering must resume when the same card returns.
 await firstImage.evaluate(img=>window.pendingThumbnail=img);await page.locator('#shape-search').fill('__no_matching_graphic__');await page.evaluate(()=>{let remaining=100;while(window.thumbnailIdle.length&&remaining--)window.thumbnailIdle.shift()();});await page.locator('#shape-search').fill('');await page.waitForFunction(()=>window.thumbnailIdle.length>0);assert.equal(await firstImage.evaluate(img=>img===window.pendingThumbnail),true);
 await page.evaluate(()=>window.thumbnailIdle.shift()());await page.waitForFunction(()=>document.querySelector('.tree-thumbnail-preview[data-state=ready] img')?.naturalWidth>0);
 assert.equal(await first.getAttribute('data-state'),'ready');assert.equal(await first.getAttribute('aria-busy'),'false');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#shape-library .tree-thumbnail-preview img')).opacity==='1');assert.equal(await first.locator('.tree-thumbnail-indicator').evaluate(e=>getComputedStyle(e).display),'none');
 // A renderer failure must end loading and leave the original resource usable.
 await frames.nth(1).locator('img').evaluate(img=>img.component=null);await page.evaluate(()=>window.thumbnailIdle.shift()());
 assert.equal(await frames.nth(1).getAttribute('data-state'),'error');assert.match(await frames.nth(1).getAttribute('title'),/仍可点击查看或添加/);
 const failedCard=page.locator('.tree-pattern-card').nth(1);await failedCard.locator('button').nth(1).click();assert.ok(await page.locator('#node-tree [role=treeitem]').count()>0);
 // Switching views preserves ready previews and keeps list-mode sizing.
 await page.locator('#shape-library-view').selectOption('list');await page.waitForFunction(()=>document.querySelector('.tree-thumbnail-preview')?.dataset.state==='ready');assert.equal(await first.evaluate(e=>e.getBoundingClientRect().width),40);
 // Force an actual image decode error, not just a synthesized error event.
 await firstImage.evaluate(img=>img.src='data:image/png;base64,invalid');await page.waitForFunction(()=>document.querySelector('.tree-thumbnail-preview')?.dataset.state==='error');assert.equal(await firstImage.evaluate(e=>getComputedStyle(e).opacity),'0');
 await page.locator('#language-settings').selectOption('en');assert.match(await first.getAttribute('aria-label'),/Preview unavailable/);assert.match(await first.getAttribute('title'),/Thumbnail could not be loaded/);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await first.locator('.tree-thumbnail-indicator').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);const report={built,pass:true,checks:['pending spinner without broken image','detached pending preview resumes','real PNG load','render failure fallback','add despite preview failure','cache reuse','40px list preview','real PNG decode failure','localized failure without reload','reduced motion']};await writeFile('test-results/thumbnail-loading/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
