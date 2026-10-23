import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {node} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {builtinAsset,contentHash} from '../web/resource-assets.js';
import {GRAPHIC_LIST_KEY,GRAPHIC_LIST_RECOVERY_KEY,serializeGraphicList} from '../web/persistent-graphic-list.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;if(name==='/blank'){res.setHeader('Content-Type','text/html');res.end('<!doctype html>');return;}const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const asset=builtinAsset('Circle');asset.definition.name='Archived custom dependency';const assetId='asset_'+await contentHash(asset),good=createProjectResource(node('shape','Circle'),{name:'My circle'}),group=node('group');group.children=[node('shape','SigilFrame'),node('shape',assetId)];const bad=createProjectResource(group,{name:'Old SigilFrame composite'}),text=serializeGraphicList([good,bad]);
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const address='http://127.0.0.1:'+server.address().port,ready=()=>page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.goto(address+'/blank');
 await page.evaluate(async({key,marker,text,assetId,asset})=>{
  localStorage.setItem(key,text);localStorage.setItem(marker,'1');
  await new Promise((resolve,reject)=>{const r=indexedDB.open('momo-texture-resources',1);r.onupgradeneeded=()=>r.result.createObjectStore('resources');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('resources','readwrite');tx.objectStore('resources').put([[assetId,asset]],'snapshot');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
 },{key:GRAPHIC_LIST_KEY,marker:GRAPHIC_LIST_DEFAULTS_KEY,text,assetId,asset});
 await page.goto(address);await ready();const warning=page.locator('.editor-notice[data-kind=warning]');assert.equal(await warning.count(),1);assert.match(await warning.textContent(),/已恢复/);
 const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),GRAPHIC_LIST_KEY);assert.deepEqual((await read()).projectResources.map(e=>e.id),[good.id]);assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).snapshots[0].text,GRAPHIC_LIST_RECOVERY_KEY),text);
 await warning.locator('summary').click();assert.match(await warning.locator('pre').textContent(),/SigilFrame/);
 const box=await warning.boundingBox();assert.ok(box.x>700&&box.y<150);await mkdir('test-results/graphics-recovery',{recursive:true});if(!process.argv.includes('--no-screenshots'))await page.screenshot({path:'test-results/graphics-recovery/'+(built?'built':'source')+'-warning.png'});
 const downloadPromise=page.waitForEvent('download');await warning.getByRole('button',{name:'下载原始备份'}).click();const download=await downloadPromise,backup=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(backup.snapshots[0].text,text);assert.equal(backup.assets[0][0],assetId);
 await page.getByRole('button',{name:'添加 My circle',exact:true}).click();assert.equal((await read()).projectResources.length,1);
 const stored=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('momo-texture-resources',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('resources').objectStore('resources').get('snapshot');q.onsuccess=()=>{db.close();resolve(q.result);};q.onerror=()=>reject(q.error);};}));assert.ok(stored.some(([id])=>id===assetId),'Quarantined custom dependencies remain saved');
 await page.locator('#language-settings').selectOption('en');assert.match(await warning.textContent(),/Graphics list recovered/);assert.match(await warning.locator('pre').textContent(),/Unknown graphic/);
 await page.setViewportSize({width:768,height:900});const narrow=await warning.boundingBox();assert.ok(narrow.x>=0&&narrow.x+narrow.width<=768);
 // An archived recovery is not a fresh failure. Clean reloads retain the list
 // and backup without showing the old warning, even after manual dismissal.
 await warning.getByRole('button',{name:'Dismiss notification'}).click();
 for(let i=0;i<2;i++){await page.reload();await ready();assert.equal(await warning.count(),0);assert.deepEqual((await read()).projectResources.map(e=>e.id),[good.id]);assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).snapshots[0].text,GRAPHIC_LIST_RECOVERY_KEY),text);}
 // Keeping an archive must not suppress a newly encountered broken entry.
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:GRAPHIC_LIST_KEY,text});await page.reload();await ready();assert.equal(await warning.count(),1);assert.match(await warning.textContent(),/1 unreadable/);assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).snapshots.length,GRAPHIC_LIST_RECOVERY_KEY),1);
 // Simulate lack of backup storage: preserve the exact active data and block writes.
 await page.evaluate(({key,recovery,text})=>{localStorage.setItem(key,text);localStorage.removeItem(recovery);localStorage.setItem('test:block-recovery','1');},{key:GRAPHIC_LIST_KEY,recovery:GRAPHIC_LIST_RECOVERY_KEY,text});
 await page.addInitScript(recovery=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===recovery&&localStorage.getItem('test:block-recovery'))throw new DOMException('Storage full','QuotaExceededError');return set.call(this,k,v);};},GRAPHIC_LIST_RECOVERY_KEY);
 await page.reload();await ready();const error=page.locator('.editor-notice[data-kind=error]');assert.equal(await error.count(),1);assert.equal(await error.getAttribute('role'),'alert');assert.equal(await page.evaluate(k=>localStorage.getItem(k),GRAPHIC_LIST_KEY),text);
 await page.waitForTimeout(6500);assert.equal(await error.count(),1,'Errors must stay until dismissed');await page.locator('#grab-uv').click();assert.equal(await error.count(),1,'Routine messages must not replace errors');await error.getByRole('button',{name:'Dismiss notification'}).click();await error.waitFor({state:'detached'});assert.equal(await error.count(),0);
 assert.deepEqual(errors,[]);const report={built,pass:true,checks:['SigilFrame isolated','valid personal entry restored','exact original backed up','backup download includes dependencies','subsequent saves retain quarantined assets','localized warning','desktop/narrow visibility','clean reloads do not repeat archived warnings','fresh failures still warn with an existing archive','quota failure preserves original','sticky errors survive routine notifications','manual dismissal']};await writeFile('test-results/graphics-recovery/'+(built?'built':'source')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
