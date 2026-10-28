import {withPagesAssets} from './helpers/pages-assets.mjs';
import {encodePNG} from '../web/encoders.js';
import {decodeZIP} from '../web/resource-zip.js';
// Real metadata editing, persistence, insertion and remote subscription in an isolated browser.
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import en from '../web/locales/en.json' with {type:'json'};
import {node,PRESET_SCHEMA} from '../web/tree-model.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {buildRemoteLibrary} from '../remote-library-publisher.mjs';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL('../web/',import.meta.url)),html=built?await readFile(new URL('../site/index.html',import.meta.url)):null;
const meta={resourceId:crypto.randomUUID(),versionId:1,personalRevision:0,name:'远程默认名',aliases:{'zh-CN':'远程冰霜',en:'Remote Frost'},kind:'formula'};
const remote=await buildRemoteLibrary([await encodeResourcePack({schema:PRESET_SCHEMA,name:meta.name,root:node(),graphicResource:meta})]);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain','.svg':'image/svg+xml'};
const server=http.createServer(withPagesAssets(async(req,res)=>{try{const url=new URL(req.url,'http://localhost').pathname;
 if(url.startsWith('/remote/')){const bytes=remote.files.get(url.slice(8));if(!bytes)throw Error();res.setHeader('Content-Type',url.endsWith('.json')?'application/json':'application/zip');res.end(bytes);return;}
 if(built){if(url!=='/MomoTextureForge/')throw Error();res.setHeader('Content-Type','text/html');res.end(html);return;}
 const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.address().port}`,address=origin+(built?'/MomoTextureForge/':'/');await page.goto(address);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#language-settings').selectOption('en');
 await page.locator('#open-graphics-library').click();const library=page.locator('.graphics-library-dialog'),search=library.locator('input[type=search]');await search.fill('圆形');const circle=library.locator('.graphics-card').filter({has:page.locator('strong').getByText('Circle',{exact:true})}).first();await circle.getByRole('button',{name:en['library.edit']+'Circle',exact:true}).click();
 const editor=page.locator('.graphic-editor-dialog');await editor.getByRole('status').filter({hasText:en['library.previewReady']??'Preview'}).first().waitFor().catch(()=>{});
 await editor.getByRole('textbox',{name:en['library.graphicName'],exact:true}).fill('默认护盾');const names=editor.locator('.graphic-name-aliases');await names.locator('summary').click();assert.deepEqual(await names.locator('select').first().locator('option').evaluateAll(list=>list.map(o=>o.value)),['zh-CN','en']);
 await names.getByRole('textbox',{name:en['graphicName.alias'],exact:true}).nth(0).fill('冰霜护盾');await names.getByRole('textbox',{name:en['graphicName.alias'],exact:true}).nth(1).fill('Frost Shield');
 const downloading=page.waitForEvent('download');downloading.catch(()=>{});await editor.getByRole('button',{name:en['library.exportAuthoringFile'],exact:true}).click();const draft=JSON.parse(await readFile(await (await downloading).path(),'utf8'));assert.equal(draft.name,'默认护盾');assert.deepEqual(draft.aliases,{'zh-CN':'冰霜护盾',en:'Frost Shield'});
 await editor.getByRole('button',{name:en['library.saveAsNewGraphic'],exact:true}).click();await editor.waitFor({state:'detached'});
 await search.fill('冰霜护盾');const card=library.locator('.graphics-card[data-origin=local]').filter({has:page.locator('strong').getByText('Frost Shield',{exact:true})});await card.waitFor();
 await card.locator('input[type=checkbox]').check();const downloadPack=page.waitForEvent('download');downloadPack.catch(()=>{});await library.getByRole('button',{name:en['library.exportResources'],exact:true}).first().click();const bytes=new Uint8Array(await readFile(await (await downloadPack).path()));
 const exported=await decodeZIP(bytes),manifest=JSON.parse(new TextDecoder().decode(exported.get('library.json'))),pack=await readResourcePack(exported.get(manifest.entries[0].file));assert.equal(pack.payload.graphicResource.name,'默认护盾');assert.deepEqual(pack.payload.graphicResource.aliases,{'zh-CN':'冰霜护盾',en:'Frost Shield'});assert.deepEqual(pack.prepared[0][1].definition.aliases,{'zh-CN':'冰霜护盾',en:'Frost Shield'});pack.rollback();await card.getByRole('button',{name:en['library.addToGraphicsList'],exact:true}).click();await library.locator('.graphics-close').click();
 await page.locator('#shape-search').fill('冰霜护盾');const shelf=page.locator('.tree-pattern-card').filter({hasText:'Frost Shield'});await shelf.waitFor();await shelf.getByRole('button',{name:en['library.addPrefix']+'Frost Shield',exact:true}).click();assert.ok((await page.locator('#node-tree').innerText()).includes('Frost Shield'));
 await page.getByRole('textbox',{name:en['editor.nodeName'],exact:true}).fill('用户节点');await page.getByRole('textbox',{name:en['editor.nodeName'],exact:true}).press('Tab');
 const before=await page.evaluate(()=>({project:localStorage.getItem('momo-texture-tree:draft:v1'),shelf:localStorage.getItem('momo-texture-tree:graphic-list:v1')}));await page.locator('#language-settings').selectOption('zh-CN');assert.ok((await page.locator('#shape-library').innerText()).includes('冰霜护盾'));assert.ok((await page.locator('#node-tree').innerText()).includes('用户节点'));assert.deepEqual(await page.evaluate(()=>({project:localStorage.getItem('momo-texture-tree:draft:v1'),shelf:localStorage.getItem('momo-texture-tree:graphic-list:v1')})),before);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#shape-search').fill('Frost Shield');await page.locator('.tree-pattern-card').filter({hasText:'冰霜护盾'}).waitFor();
 await page.locator('#open-graphics-library').click();await page.getByRole('button',{name:'远程图库',exact:true}).click();await page.getByLabel('新图库名称',{exact:true}).fill('名称测试图库');await page.getByLabel('远程目录地址',{exact:true}).fill(origin+'/remote/index.json');await page.getByRole('button',{name:'添加订阅',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.remote-source').length===1&&!document.querySelector('.remote-library-dialog form').inert);await page.locator('.remote-library-dialog .graphics-close').click();
 await library.locator('input[type=search]').fill('Remote Frost');await library.locator('.graphics-card[data-origin=remote]').filter({has:page.locator('strong').getByText('远程冰霜',{exact:true})}).waitFor();
 await library.locator('.graphics-close').click();await page.locator('#language-settings').selectOption('en');await page.locator('#open-graphics-library').click();await library.locator('input[type=search]').fill('远程冰霜');const remoteCard=library.locator('.graphics-card[data-origin=remote]').filter({has:page.locator('strong').getByText('Remote Frost',{exact:true})});await remoteCard.waitFor();await remoteCard.getByRole('button',{name:en['library.addDirectlyToCanvas'],exact:true}).click();await library.waitFor({state:'detached'});assert.ok((await page.locator('#node-tree').innerText()).includes('Remote Frost'));assert.ok((await page.locator('#node-tree').innerText()).includes('用户节点'));

 async function setNames(dialog,defaultName,values){
  await dialog.getByRole('textbox',{name:en['library.resourceName'],exact:true}).fill(defaultName);const control=dialog.locator('.graphic-name-aliases');if(!await control.evaluate(e=>e.open))await control.locator('summary').click();
  for(const [language,value]of Object.entries(values)){let target;for(const row of await control.locator('.parameter-alias-row').all())if(await row.locator('select').inputValue()===language)target=row;if(!target){await control.getByRole('button',{name:en['ui.addLanguage'],exact:true}).click();target=control.locator('.parameter-alias-row').last();await target.locator('select').selectOption(language);}await target.locator('input').fill(value);}
 }
 for(const kind of ['image','generator']){
  await page.locator('#open-graphics-library').click();await library.getByRole('button',{name:en['library.createResource'],exact:true}).click();const creator=page.locator('.resource-create-dialog');
  if(kind==='generator')await creator.getByRole('tab',{name:en['library.generator'],exact:true}).click();
  else{const pixels=new Float32Array(16*16*4).fill(1),png=await encodePNG(pixels,16,16);await creator.locator('section[role=tabpanel]:not([hidden]) input[type=file]').first().setInputFiles({name:'测试图片.png',mimeType:'image/png',buffer:Buffer.from(png)});}
  await creator.locator('.graphic-preview-panel [role=status]').filter({hasText:/Preview/}).waitFor();const values={'zh-CN':kind==='image'?'图片别名':'生成器别名',en:kind==='image'?'Named Image':'Named Generator'};await setNames(creator,'默认'+kind,values);
  if(kind==='generator'){const pending=page.waitForEvent('download');pending.catch(()=>{});await creator.getByRole('button',{name:en['generator.exportGeneratorJSON'],exact:true}).click();const source=JSON.parse(await readFile(await (await pending).path(),'utf8'));assert.deepEqual(source.aliases,values);}
  await creator.getByRole('button',{name:en['library.importIntoLibrary'],exact:true}).click();await creator.waitFor({state:'detached'});await library.locator('input[type=search]').fill(values['zh-CN']);await library.locator('.graphics-card[data-origin=local]').filter({has:page.locator('strong').getByText(values.en,{exact:true})}).waitFor();await library.locator('.graphics-close').click();
 }
 await page.locator('#save-whole-library').click();const publishing=page.locator('dialog[open]');await setNames(publishing,'默认组合',{'zh-CN':'组合别名',en:'Named Composition'});await publishing.getByRole('button',{name:en['library.saveAsNewResource'],exact:true}).click();await publishing.waitFor({state:'detached'});
 await page.locator('#open-graphics-library').click();await library.locator('input[type=search]').fill('组合别名');await library.locator('.graphics-card[data-origin=local]').filter({has:page.locator('strong').getByText('Named Composition',{exact:true})}).waitFor();await library.locator('.graphics-close').click();assert.ok((await page.locator('#node-tree').innerText()).includes('用户节点'));
 await mkdir(new URL('../test-results/graphic-names/',import.meta.url),{recursive:true});await page.screenshot({path:fileURLToPath(new URL(`../test-results/graphic-names/${built?'built':'source'}-names.png`,import.meta.url))});assert.deepEqual(errors,[]);console.log(JSON.stringify({built,pass:true,checks:['builtin aliases','name editing','authoring JSON','ZIP export','cross-language search','shelf persistence','independent canvas names','remote aliases and insertion','image names','generator names and JSON','composition names'],errors}));
}catch(error){console.error(error);await mkdir(new URL('../test-results/graphic-names/',import.meta.url),{recursive:true});if(browser){const page=browser.contexts()[0]?.pages()[0];await page?.screenshot({path:fileURLToPath(new URL('../test-results/graphic-names/failure.png',import.meta.url))}).catch(()=>{});}throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
