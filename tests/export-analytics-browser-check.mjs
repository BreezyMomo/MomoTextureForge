// Actual export UI/Blob workers/downloads; the tracker is intercepted, never sent.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {pagesAsset} from './helpers/pages-assets.mjs';

await mkdir('test-results/export-analytics',{recursive:true});
const html=await readFile('site/index.html','utf8'),p=project();
p.name='PRIVATE_CANVAS_NAME';p.root.children=[node('shape','Circle')];
Object.assign(p.output,{width:64,height:64,seconds:.2,exportSeconds:.2,fps:10,frames:2,columns:2});
const hash=Buffer.from(JSON.stringify(p)).toString('base64');
const browser=await chromium.launch({channel:'msedge',headless:true});
let page;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100},locale:'zh-CN'});
 await context.addInitScript(()=>{
  localStorage.setItem('momo-texture-language:v1',JSON.stringify(['zh-CN','en']));
  Object.defineProperty(navigator,'clipboard',{value:{write:async()=>{if(window.__clipboardReject)throw Error('denied');if(window.__clipboardHold){window.__clipboardPending=true;await new Promise(resolve=>window.__finishClipboard=resolve);}window.__clipboardWrites=(window.__clipboardWrites||0)+1;}}});
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker{postMessage(data,...args){if(window.__holdExportWorker&&data.type==='start'){window.__exportWorkerHeld=true;return;}return super.postMessage(data,...args);}};
 });
 await context.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith('https://hm.baidu.com/'))return route.fulfill({contentType:'text/javascript',body:'window.__trackerLoaded=true;'});
  if(route.request().isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});
  const asset=await pagesAsset(url);if(asset)return route.fulfill(asset);
  return route.abort();
 });
 page=await context.newPage();const errors=[],downloads=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d));
 await page.goto('https://momo-texture-forge.app.workbuddy.host/?sharecode=PRIVATE#tree='+hash);
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true'&&window.__trackerLoaded);
 await page.locator('#export-now').click();
 const events=()=>page.evaluate(()=>window._hmt.filter(e=>e[0]==='_trackEvent'));
 const idle=()=>page.waitForFunction(()=>!document.getElementById('confirm-export')?.disabled);
 const select=async(kind,channel='color')=>{
  await page.getByRole('combobox',{name:'导出类型',exact:true}).selectOption('png');
  await page.getByRole('combobox',{name:'输出内容',exact:true}).selectOption(channel);
  await page.getByRole('combobox',{name:'导出类型',exact:true}).selectOption(kind);
 };
 let count=0;
 for(const [kind,channel]of [['png','color'],['exr','height'],['svg','color'],['psd','normal'],['psd-vector','color'],['frames','normal'],['atlas','rgba'],['atlas-exr','normal'],['batch','color'],['batch-atlas','color']]){
  await select(kind,channel);const pending=page.waitForEvent('download');await page.locator('#confirm-export').click();
  const d=await pending;assert.equal(await d.failure(),null);await idle();
  assert.equal((await readFile(await d.path())).length>0,true);
  const recorded=await events();assert.equal(recorded.length,++count);
  assert.deepEqual(recorded.at(-1),['_trackEvent','export','download',kind+'/'+channel]);
 }
 assert.equal(downloads.length,10,'multi-frame and multi-size ZIP each counts as one download');
 await select('copy','height');await page.locator('#confirm-export').click();await idle();
 assert.equal((await events()).length,++count);assert.equal(downloads.length,10);
 assert.deepEqual((await events()).at(-1),['_trackEvent','export','clipboard','png/height']);
 await page.evaluate(()=>window.__clipboardReject=true);
 const fallback=page.waitForEvent('download');await page.locator('#confirm-export').click();await fallback;await idle();
 assert.equal((await events()).length,++count);
 assert.deepEqual((await events()).at(-1),['_trackEvent','export','download','png/height']);
 await page.evaluate(()=>{window.__clipboardReject=false;window.__clipboardHold=true;});
 await page.locator('#confirm-export').click();await page.waitForFunction(()=>window.__clipboardPending);
 await page.getByRole('button',{name:'取消导出',exact:true}).click();
 await page.evaluate(()=>{window.__clipboardHold=false;window.__finishClipboard();});await idle();
 assert.equal((await events()).length,count);assert.equal(downloads.length,11);
 await select('atlas');await page.locator('#generate-export-preview').click();await idle();
 await page.locator('#global-controls .tree-export-preview canvas').waitFor();await page.waitForFunction(()=>document.querySelector('#global-controls .tree-export-preview img')?.naturalWidth>0);assert.equal((await events()).length,count);
 await page.locator('#close-global').click();await page.locator('#export-now').click();
 await select('png');await page.evaluate(()=>{window.__holdExportWorker=true;window.__exportWorkerHeld=false;});
 await page.locator('#confirm-export').click();await page.waitForFunction(()=>window.__exportWorkerHeld);
 await page.getByRole('button',{name:'取消导出',exact:true}).click();await idle();
 assert.equal((await events()).length,count);assert.equal(downloads.length,11);
 await page.evaluate(()=>window.__holdExportWorker=false);
 await select('atlas');const width=page.getByRole('spinbutton',{name:'像素宽',exact:true});await width.fill('4096');await width.press('Tab');
 await page.locator('#confirm-export').click();await idle();
 assert.match(await page.locator('#tree-toast').innerText(),/预算/);assert.equal((await events()).length,count);assert.equal(downloads.length,11);
 assert.doesNotMatch(JSON.stringify(await events()),/PRIVATE|sharecode|tree=/);
 assert.deepEqual(errors,[]);
 const summary={events:await events(),downloads:downloads.length,cancel:'excluded',failure:'excluded',preview:'excluded',privacy:'passed',errors};
 await writeFile('test-results/export-analytics/result.json',JSON.stringify(summary,null,2));
 console.log('Export analytics passed: 10 real formats, all 4 channels, one count per ZIP, clipboard/fallback, cancellation, failure, preview exclusion and private-data isolation.');
}catch(error){if(page&&!process.argv.includes('--no-screenshots'))await page.screenshot({path:'test-results/export-analytics/error.png'}).catch(()=>{});throw error;}
finally{await browser.close();}
