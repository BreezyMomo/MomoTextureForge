import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {pagesAsset} from './helpers/pages-assets.mjs';

const html=await readFile('site/index.html','utf8'),offline=await readFile('dist/MomoTextureForge.html','utf8');
const realSDK=process.argv.includes('--real-sdk');
assert.ok(html.includes("script-src 'self' 'unsafe-inline' https://hm.baidu.com;"));
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
    if(new URL(request.url()).pathname!=='/hm.js')return route.fulfill({contentType:'image/gif',body:Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64')});
    if(realSDK){
     const response=await fetch(request.url(),{headers:{Referer:headers.referer}}),body=await response.text();
     assert.ok(response.ok&&body.length>1000,'real Baidu SDK must return nonempty code');
     return route.fulfill({contentType:'text/javascript',body});
    }
    return route.fulfill({contentType:'text/javascript',body:'window.__capturedAnalytics=JSON.parse(JSON.stringify(window._hmt));'});
   }
   if(request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});
   const asset=await pagesAsset(request.url());if(asset)return route.fulfill(asset);
   return route.abort();
  });
  await page.goto(url);
  if(id){
   await page.waitForFunction(({id,realSDK})=>realSDK?window['_bdhm_loaded_'+id]:window.__capturedAnalytics,{id,realSDK});
   const scripts=requests.filter(r=>new URL(r.url).pathname==='/hm.js');
   assert.equal(scripts.length,1);assert.equal(scripts[0].url,'https://hm.baidu.com/hm.js?'+id);
   assert.equal(scripts[0].headers.referer,new URL(url).origin+'/');
   assert.doesNotMatch(scripts[0].headers.referer,/PRIVATE|sharecode|tree=|token=/);
   if(!realSDK){const queue=await page.evaluate(()=>window.__capturedAnalytics);assert.deepEqual(queue.find(x=>x[0]==='_trackPageview'),['_trackPageview',path]);assert.doesNotMatch(JSON.stringify(queue),/PRIVATE|sharecode|tree=/);}
   const eventResponse=realSDK?page.waitForResponse(r=>{const u=new URL(r.url());return u.hostname==='hm.baidu.com'&&u.searchParams.get('et')==='4';}):null;
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('momo:export-completed',{detail:{action:'download',format:'png',channel:'normal',name:'PRIVATE'}})));
   if(realSDK){
    await eventResponse;
    const beacon=requests.map(r=>new URL(r.url)).find(u=>u.searchParams.get('et')==='4');
    assert.equal(beacon.searchParams.get('ep'),'export*download*png/normal');
    assert.equal(beacon.searchParams.get('u'),new URL(path,url).href);
    assert.doesNotMatch(decodeURIComponent(beacon.href),/PRIVATE|sharecode|tree=|token=/);
   }else assert.deepEqual(await page.evaluate(()=>window._hmt.at(-1)),['_trackEvent','export','download','png/normal']);
  }else{
   await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
   assert.equal(requests.length,0);
  }
  await page.close();
 }
 const blocked=await browser.newPage();
 await blocked.route('**/*',async route=>{if(route.request().isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});const asset=await pagesAsset(route.request().url());return asset?route.fulfill(asset):route.abort();});
 await blocked.goto('https://momo-texture-forge.app.workbuddy.host/');
 await blocked.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 assert.equal(await blocked.locator('#open-graphics-library').count(),1);
 console.log('Analytics browser checks passed'+(realSDK?' (real Baidu SDK, intercepted beacons)':'')+': host isolation, CSP, sanitized PV/events, origin-only script Referer, offline isolation, blocked tracker does not block editor.');
}finally{await browser.close();}
