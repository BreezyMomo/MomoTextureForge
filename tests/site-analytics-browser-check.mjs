import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const html=await readFile('site/index.html','utf8'),offline=await readFile('dist/MomoTextureForge.html','utf8');
assert.ok(html.includes("script-src 'unsafe-inline' https://hm.baidu.com;"));
assert.ok(!offline.includes('hm.baidu.com'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const [url,id,path]of [
  ['https://breezymomo.github.io/MomoTextureForge/?token=PRIVATE#tree=PRIVATE','067c64539a82f8a5cc10389781ba1b75','/MomoTextureForge/'],
  ['https://momo-texture-forge.app.workbuddy.host/?sharecode=PRIVATE#tree=PRIVATE','a22e68093f1a42a8cbfa480f7425636f','/'],
  ['https://momo-texture-forge.app.workbuddy.host/?view=examples&sharecode=PRIVATE','a22e68093f1a42a8cbfa480f7425636f','/examples'],
  ['https://example.com/',null,null],
  ['http://127.0.0.1:8799/',null,null]
 ]){
  const page=await browser.newPage(),requests=[];
  await page.route('**/*',async route=>{
   const request=route.request();
   if(request.url().startsWith('https://hm.baidu.com/')){
    const headers=await request.allHeaders();requests.push({url:request.url(),headers});
    // Baidu can reply 200 with no code when the script omits its Referer.
    // Model that response so merely inserting a script cannot pass this check.
    if(headers.referer!==new URL(url).origin+'/')return route.fulfill({contentType:'text/plain',body:''});
    return route.fulfill({contentType:'text/javascript',body:'window.__capturedAnalytics=JSON.parse(JSON.stringify(window._hmt));'});
   }
   if(request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});
   return route.abort();
  });
  await page.goto(url);
  if(id){
   await page.waitForFunction(()=>window.__capturedAnalytics);
   const queue=await page.evaluate(()=>window.__capturedAnalytics);
   assert.equal(requests.length,1);assert.equal(requests[0].url,'https://hm.baidu.com/hm.js?'+id);
   assert.equal(requests[0].headers.referer,new URL(url).origin+'/');
   assert.doesNotMatch(requests[0].headers.referer,/PRIVATE|sharecode|tree=|token=/);
   assert.deepEqual(queue.find(x=>x[0]==='_trackPageview'),['_trackPageview',path]);
   assert.doesNotMatch(JSON.stringify(queue),/PRIVATE|sharecode|tree=/);
  }else{
   await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
   assert.equal(requests.length,0);
  }
  await page.close();
 }
 const blocked=await browser.newPage();
 await blocked.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:html}):route.abort());
 await blocked.goto('https://momo-texture-forge.app.workbuddy.host/');
 await blocked.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 assert.equal(await blocked.locator('#open-graphics-library').count(),1);
 console.log('Analytics browser checks passed: host isolation, CSP, sanitized PV, origin-only script Referer, offline isolation, blocked tracker does not block editor.');
}finally{await browser.close();}
