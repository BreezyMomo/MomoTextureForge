// Exercise the optional Airy style, real parameter controls and shared SVG actions.
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {STYLE_IDS} from '../web/appearance.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),output=new URL('../test-results/editor-polish/',import.meta.url);
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root)||!types[path.extname(file)])throw Error();res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const draft=project(),a=node('shape','Circle'),b=node('shape','Circle'),group=node('group');a.name='A';b.name='B';group.name='Group';group.children=[b];draft.root.children=[a,group];
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/#tree='+Buffer.from(JSON.stringify(draft)).toString('base64'));
 const ready=async()=>{await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#startup-screen').waitFor({state:'detached'});};await ready();
 const select=id=>page.locator('[role=treeitem][data-node-id="'+id+'"] .tree-node-name').click();await select(a.id);
 const snapshot=()=>page.evaluate(()=>({hash:location.hash,draft:localStorage.getItem('momo-texture-tree:draft:v1'),undo:document.querySelector('#undo').disabled,redo:document.querySelector('#redo').disabled,pixels:document.querySelector('#tree-canvas').toDataURL()}));
 const initial=await snapshot(),open=()=>page.locator('#appearance-settings').click(),style=id=>page.locator('.appearance-style-card[data-style='+id+']').click();
 await open();assert.equal(await page.locator('.appearance-style-card').count(),9);for(const id of STYLE_IDS)assert.equal(await page.locator('[data-style='+id+']').count(),1);
 await style('airy');await page.locator('#appearance-theme').selectOption('mineral');await page.locator('#appearance-tabs').selectOption('pill');await page.locator('[data-save]').click();
 assert.deepEqual(await snapshot(),initial,'switching styles preserves artwork and history');
 const module=page.locator('#inspector details[data-module="modules.shapeParameters"]'),field=path=>page.locator('#inspector .tree-number-field[data-parameter-path="'+path+'"]');
 for(const mode of ['shuimo','xuanhei','yuebai','qingci','qinghua','mineral','ouhe']){
  await open();await page.locator('#appearance-theme').selectOption(mode);await page.locator('[data-save]').click();
  const borders=await module.evaluate(e=>({left:getComputedStyle(e).borderLeftColor,top:getComputedStyle(e).borderTopColor,heading:getComputedStyle(e.firstElementChild).backgroundColor}));
  assert.equal(borders.left,'rgba(0, 0, 0, 0)');assert.notEqual(borders.top,'rgba(0, 0, 0, 0)');assert.notEqual(borders.heading,'rgba(0, 0, 0, 0)');
  for(const width of [240,300,400]){
   await page.locator('#inspector').evaluate((e,width)=>e.style.width=width+'px',width);
   const rows=await module.locator('.tree-number-field').evaluateAll(elements=>elements.map(e=>{const num=e.querySelector('[type=number]'),reset=e.querySelector('[data-reset-parameter]'),key=e.querySelector('[data-key-path]'),r=e.getBoundingClientRect();return {overflow:e.scrollWidth>e.clientWidth+1,number:num.getBoundingClientRect().width,reset:reset.getBoundingClientRect().width,key:key.getBoundingClientRect().width,sameLine:Math.abs(num.getBoundingClientRect().y-reset.getBoundingClientRect().y)<4,bounded:key.getBoundingClientRect().right<=r.right+1};}));
   for(const row of rows){assert.equal(row.overflow,false);assert.equal(row.number,80);assert.equal(row.reset,28);assert.equal(row.key,28);assert.ok(row.sameLine&&row.bounded);}
  }
  await page.locator('#inspector').evaluate(e=>e.style.removeProperty('width'));
 }
 assert.equal(await field('params.0').locator('[data-reset-parameter] svg.editor-icon').count(),1);assert.equal(await field('params.0').locator('[data-key-path] svg.editor-icon').count(),1);
 const value=()=>field('params.0').locator('[type=number]');await value().fill('0.4');await value().press('Tab');assert.equal(await value().inputValue(),'0.4');
 await field('params.0').locator('[data-reset-parameter]').click();assert.equal(await value().inputValue(),'0.62');await page.locator('#undo').click();assert.equal(await value().inputValue(),'0.4');await page.locator('#undo').click();
 await field('params.0').locator('[data-key-path]').click();await page.waitForFunction(()=>document.querySelector('#inspector [data-key-path="params.0"]').dataset.keyState==='current');assert.ok(await value().isDisabled());await page.locator('#undo').click();assert.equal(await value().isDisabled(),false);
 await open();await style('refined');await page.locator('[data-save]').click();assert.notEqual(await module.evaluate(e=>getComputedStyle(e).borderLeftColor),'rgba(0, 0, 0, 0)','framed styles remain available');
 await open();await style('airy');await page.locator('[data-save]').click();await page.reload();await ready();assert.equal(await page.locator('html').getAttribute('data-interface-style'),'airy');assert.equal(await page.locator('html').getAttribute('data-tab-style'),'pill');
 await select(a.id);await open();await style('standard');await page.keyboard.press('Escape');assert.equal(await page.locator('html').getAttribute('data-interface-style'),'airy');
 await page.locator('#inspector-tabs').getByRole('button',{name:'变换/排列',exact:true}).click();assert.equal(await field('transform.rotation').locator('.parameter-unit').innerText(),'°');assert.equal(await field('transform.x').locator('.parameter-axis').innerText(),'X');assert.equal(await field('transform.y').locator('.parameter-axis').innerText(),'Y');assert.ok(await field('transform.rotation').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.locator('#language-settings').selectOption('en');assert.match(await field('transform.x').locator('label').innerText(),/Position/);assert.equal(await field('transform.rotation').locator('label').innerText(),'Rotation');assert.equal(await field('transform.rotation').locator('.parameter-unit').innerText(),'°');await page.locator('#language-settings').selectOption('zh-CN');assert.match(await field('transform.x').locator('label').innerText(),/位置/);await page.locator('#inspector-tabs').getByRole('button',{name:'图形',exact:true}).click();
 assert.equal(await page.locator('.tree-node-name .editor-icon').count(),3);assert.equal(await page.locator('.module-drag-handle .editor-icon').count()>0,true);
 for(const mode of ['shuimo','yuebai']){await open();await page.locator('#appearance-theme').selectOption(mode);await page.locator('[data-save]').click();await page.screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-airy-'+mode+'.png',output))});}
 await page.locator('[role=treeitem][data-node-id="'+b.id+'"] .tree-node-name').click({modifiers:['Control']});
 const batch=page.locator('#inspector .selection-number-field').first();await batch.waitFor();assert.equal(await batch.locator('[data-reset] svg').count(),1);assert.ok(await batch.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({built,pass:true,checks:['nine styles retained','Airy opt-in and save/cancel/reload','unchanged artwork','dark/light/graphite frames','240/300/400px numeric alignment','SVG actions retain reset/undo/keyframes','framed styles restored','multi-selection layout'],errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
