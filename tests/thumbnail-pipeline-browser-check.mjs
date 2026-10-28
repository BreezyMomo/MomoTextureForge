import {withPagesAssets} from './helpers/pages-assets.mjs';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {node} from '../web/tree-model.js';
import {withBuiltinGraphics,GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
import {createProjectResource} from '../web/project-resources.js';
import {GRAPHIC_LIST_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';

const built=process.argv.includes('--built'),root=fileURLToPath(new URL('../',import.meta.url));
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(withPagesAssets(async(req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname,file=path.resolve(root,pathname==='/built.html'?'site/index.html':'web/.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}}));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1600,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const custom=['Circle','Ring'].map((id,i)=>{const n=node('shape',id);n.opacity=.81-i*.1;return createProjectResource(n,{name:'Custom '+id});});
 const builtin=(await withBuiltinGraphics([])).filter(e=>['Circle','Ring'].includes(e.builtin));
 await page.addInitScript(({key,marker,text})=>{
  if(!localStorage.getItem('thumbnail-test-seeded')){localStorage.setItem(key,text);localStorage.setItem(marker,'1');localStorage.setItem('thumbnail-test-seeded','1');}
  window.thumbStats={renders:0};window.thumbnailIdle=[];window.requestIdleCallback=callback=>{window.thumbnailIdle.push(callback);return window.thumbnailIdle.length;};
  const encode=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=function(...args){if(this.width===72&&this.height===72)window.thumbStats.renders++;return encode.apply(this,args);};
 },{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList([...custom,...builtin])});
 const address=origin+(built?'/built.html':'/'),load=async()=>{await page.goto(address);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');};
 const ready=()=>page.waitForFunction(()=>document.querySelectorAll('#shape-library img[data-ready=true]').length===4);
 const drain=async()=>{for(let i=0;i<10;i++){if(await page.locator('#shape-library img[data-ready=true]').count()===4)return;await page.waitForFunction(()=>window.thumbnailIdle.length>0);await page.evaluate(()=>window.thumbnailIdle.shift()({timeRemaining:()=>0}));}await ready();};
 const cacheItems=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('momo-texture-thumbnails-v1',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('images').objectStore('images').getAll();q.onsuccess=()=>{db.close();resolve(q.result);};q.onerror=reject;};r.onerror=reject;}));
 await load();await page.waitForFunction(()=>document.querySelectorAll('#shape-library img[data-ready=true]').length===2&&window.thumbnailIdle.length>0);
 assert.equal(await page.evaluate(()=>window.thumbStats.renders),0,'built-ins never wait for the held GPU lane');
 await drain();await ready();assert.equal(await page.evaluate(()=>window.thumbStats.renders),2);
 await page.waitForFunction(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('momo-texture-thumbnails-v1',1);q.onsuccess=()=>r(q.result);});const count=await new Promise(r=>{const q=db.transaction('images').objectStore('images').count();q.onsuccess=()=>r(q.result);});db.close();return count===2;});
 const firstSources=await page.locator('#shape-library img').evaluateAll(es=>es.map(e=>e.src));
 await page.reload();await ready();assert.equal(await page.evaluate(()=>window.thumbStats.renders),0,'reload reads persisted PNGs without executing held GPU work');assert.deepEqual(await page.locator('#shape-library img').evaluateAll(es=>es.map(e=>e.src)),firstSources);
 await page.locator('#language-settings').selectOption('en');await page.locator('#shape-search').fill('Custom');await page.locator('#shape-search').fill('');await ready();assert.equal(await page.evaluate(()=>window.thumbStats.renders),0);
 // Same resource/version ID with genuinely different pixels must miss the cache.
 await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key));p.projectResources[0].root.opacity=.42;p.projectResources[0].personalRevision++;localStorage.setItem(key,JSON.stringify(p));},GRAPHIC_LIST_KEY);
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#shape-library img[data-ready=true]').length===3&&window.thumbnailIdle.length>0);await drain();assert.equal(await page.evaluate(()=>window.thumbStats.renders),1);
 // A decodable-looking but corrupt cached PNG gets evicted and rendered again.
 const items=await cacheItems();assert.equal(items.length,3);
 await page.evaluate(items=>new Promise(resolve=>{const r=indexedDB.open('momo-texture-thumbnails-v1',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('images','readwrite');for(const item of items)tx.objectStore('images').put({...item,src:'data:image/png;base64,AAAA'});tx.oncomplete=()=>{db.close();resolve();};};}),items);
 await page.reload();await drain();await ready();assert.equal(await page.evaluate(()=>window.thumbStats.renders),2,'corrupt cache retries through the GPU lane');
 assert.equal(await page.locator('#shape-library .tree-thumbnail-preview[data-state=error]').count(),0);
 // Cache failure is independent of the project's existing IndexedDB stores.
 const denied=await browser.newContext({viewport:{width:1600,height:1050}}),fallback=await denied.newPage();
 await fallback.addInitScript(({key,marker,text})=>{localStorage.setItem(key,text);localStorage.setItem(marker,'1');const open=indexedDB.open.bind(indexedDB);indexedDB.open=(name,...args)=>{if(name==='momo-texture-thumbnails-v1')throw Error('blocked thumbnail storage');return open(name,...args);};},{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text:serializeGraphicList(custom)});
 await fallback.goto(address);await fallback.waitForFunction(()=>document.querySelectorAll('#shape-library img[data-ready=true]').length===2);await denied.close();
 // Test scheduling with controlled visibility, independent of GPU compilation order.
 const scheduler=await context.newPage();await scheduler.goto(origin+'/authoring-render.html');
 const priority=await scheduler.evaluate(async()=>{
  const {patternThumbnails}=await import('./pattern-thumbnails.js'),{node}=await import('./tree-model.js');
  const idle=[];window.requestIdleCallback=cb=>(idle.push(cb),idle.length);let observer;
  window.IntersectionObserver=class{constructor(cb){this.cb=cb;observer=this;}observe(){}unobserve(){}disconnect(){}};
  const root=document.createElement('div');root.style.cssText='position:fixed;top:0;left:0;width:200px;height:100px;overflow:auto';document.body.replaceChildren(root);
  const imgs=Array.from({length:3},()=>{const card=document.createElement('div'),img=document.createElement('img');img.width=img.height=72;card.style.height='110px';card.append(img);root.append(card);return img;});
  const thumbnails=patternThumbnails(root);imgs.forEach((img,i)=>{const n=node();n.opacity=.6+i*.1;thumbnails.observe(img,'priority-'+i,n);img.parentElement.style.cssText='display:block;width:72px;height:72px';});
  observer.cb([{target:imgs[1],isIntersecting:true},{target:imgs[0],isIntersecting:true}]);
  // Wait for both independent identity/cache reads before allowing any drawing.
  await new Promise(r=>setTimeout(r,300));if(!idle.length)throw Error('GPU work was not scheduled');idle.shift()({timeRemaining:()=>0});
  await imgs[0].decode();if(imgs[1].src)throw Error('prefetch was rendered before the visible card');
  root.scrollTop=220;observer.cb([{target:imgs[0],isIntersecting:false},{target:imgs[1],isIntersecting:false},{target:imgs[2],isIntersecting:true}]);
  await new Promise(r=>setTimeout(r,300));while(idle.length&&!imgs[2].src)idle.shift()({timeRemaining:()=>0});await imgs[2].decode();
  if(imgs[1].src)throw Error('offscreen work survived cancellation');thumbnails.release();return {visibleBeforePrefetch:true,offscreenCanceled:true};
 });
 // Bound cache growth without touching any project/resource database.
 const bounded=await browser.newContext(),limitPage=await bounded.newPage();await limitPage.goto(origin+'/authoring-render.html');
 const count=await limitPage.evaluate(async()=>{const {createThumbnailCache}=await import('./thumbnail-cache.js');const c=createThumbnailCache(),png='data:image/png;base64,AAAA';await Promise.all(Array.from({length:270},(_,i)=>c.put('limit-'+i,png)));const db=await new Promise(r=>{const q=indexedDB.open('momo-texture-thumbnails-v1',1);q.onsuccess=()=>r(q.result);});const count=await new Promise(r=>{const q=db.transaction('images').objectStore('images').count();q.onsuccess=()=>r(q.result);});db.close();c.close();return count;});assert.equal(count,256);await bounded.close();
 assert.deepEqual(errors,[]);const report={built,pass:true,builtinsBypassGPU:true,persistedReload:true,contentInvalidation:true,corruptCacheFallback:true,storageFallback:true,...priority,boundedCache:count};await mkdir('test-results/thumbnail-pipeline',{recursive:true});await writeFile('test-results/thumbnail-pipeline/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
