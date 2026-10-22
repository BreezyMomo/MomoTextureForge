// Exercise the real editor and its built distribution without changing artwork.
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
const built=process.argv.includes('--built'),root=path.resolve(fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)));
const output=new URL('../test-results/appearance/',import.meta.url);await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const target=path.resolve(root,'.'+(req.url==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!target.startsWith(root+path.sep)||!types[path.extname(target)])throw Error();res.setHeader('Content-Type',types[path.extname(target)]);res.end(await readFile(target));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const draft=project();draft.name='Theme isolation';draft.root.children=[node('shape','Circle')];
 await page.goto(`http://127.0.0.1:${server.address().port}/#tree=`+Buffer.from(JSON.stringify(draft)).toString('base64'));
 const ready=async()=>{await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#startup-screen').waitFor({state:'detached'});};await ready();
 await page.locator('[role=treeitem]').first().click();
 const snapshot=()=>page.evaluate(()=>({storage:Object.fromEntries(Object.entries(localStorage).filter(([key])=>key!=='momo-texture-appearance:v1')),hash:location.hash,undo:document.querySelector('#undo').disabled,redo:document.querySelector('#redo').disabled,pixels:document.querySelector('#tree-canvas').toDataURL(),guides:getComputedStyle(document.querySelector('#tree-preview-surface'),'::after').borderColor}));
 const before=await snapshot(),appearance=page.locator('#appearance-settings');
 assert.equal(await page.locator('html').getAttribute('data-interface-style'),'standard');
 assert.notEqual(await page.locator('.dock-stack').first().evaluate(e=>getComputedStyle(e).boxShadow),'none');
 const open=async()=>{await appearance.click();await page.locator('.appearance-dialog').waitFor();};
 const theme=page.locator('#appearance-theme');
 await open();assert.equal(await page.locator('#appearance-style option[value=standard]').innerText(),'精致');assert.notEqual(await page.locator('.appearance-dialog').evaluate(e=>getComputedStyle(e).boxShadow),'none');await theme.selectOption('light');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 assert.equal(await page.locator('.appearance-dialog').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
 await page.locator('#appearance-hex').fill('#ffff00');await page.locator('#appearance-hex').dispatchEvent('input');
 await page.locator('[data-save]').click();assert.equal(await page.locator('.appearance-dialog').count(),0);
 assert.deepEqual(await snapshot(),before);
 await page.screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-light.png',output))});
 await page.reload();await ready();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.equal(await page.locator('html').evaluate(e=>e.style.getPropertyValue('--ui-accent')),'#ffff00');
 await open();await theme.selectOption('graphite');await page.keyboard.press('Escape');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await open();await theme.selectOption('system');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='classic');await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');await page.locator('[data-save]').click();
 await page.locator('[role=treeitem]').first().click();await open();await theme.selectOption('light');await page.screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-settings-chinese.png',output))});await page.locator('[data-save]').click();
 const style=page.locator('#appearance-style'),density=page.locator('#appearance-density');
 const projectSnapshot=async()=>{const {pixels,...stable}=await snapshot();return stable;},stable=await projectSnapshot();
 await open();
 for(const themeId of ['classic','graphite','light']){
  await theme.selectOption(themeId);
  for(const [styleId,radius]of [['standard','6px'],['minimal','2px'],['soft','8px']]){
   await style.selectOption(styleId);
   for(const densityId of ['compact','comfortable']){
    await density.selectOption(densityId);
    assert.equal(await page.locator('html').getAttribute('data-interface-style'),styleId);assert.equal(await page.locator('html').getAttribute('data-density'),densityId);
    assert.equal(await page.locator('#appearance-hex').evaluate(e=>getComputedStyle(e).borderRadius),radius);
    assert.equal(await page.locator('.inspector-module').first().evaluate(e=>getComputedStyle(e).borderLeftWidth),styleId==='minimal'?'0px':'1px');
    assert.equal(await page.locator('.inspector-module-body').first().evaluate(e=>getComputedStyle(e).paddingTop),densityId==='compact'?'9px':'14px');
    assert.equal(await page.locator('.dock-stack').first().evaluate(e=>getComputedStyle(e).boxShadow==='none'),styleId==='minimal');
    assert.equal(await page.locator('.tree-visibility').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.deepEqual(await projectSnapshot(),stable);
   }
  }
 }
 await style.selectOption('minimal');await density.selectOption('comfortable');await page.locator('[data-save]').click();
 await page.reload();await ready();assert.equal(await page.locator('html').getAttribute('data-interface-style'),'minimal');assert.equal(await page.locator('html').getAttribute('data-density'),'comfortable');
 await page.locator('[role=treeitem]').first().click();
 for(const styleId of ['standard','minimal','soft']){
  await open();await style.selectOption(styleId);await page.locator('[data-save]').click();
  await page.screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-style-'+styleId+'.png',output))});
 }
 await open();await density.selectOption('compact');await theme.selectOption('graphite');assert.equal(await style.inputValue(),'soft');assert.equal(await density.inputValue(),'compact');await page.keyboard.press('Escape');assert.equal(await page.locator('html').getAttribute('data-density'),'comfortable');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.locator('#language-settings').selectOption('en');await open();assert.equal(await page.locator('#appearance-title').innerText(),'Appearance');assert.equal(await page.locator('#appearance-style option[value=standard]').innerText(),'Refined');assert.equal(await theme.locator('option').count(),4);await theme.selectOption('graphite');await page.locator('[data-save]').click();
 await page.screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-graphite.png',output))});
 for(const width of [1600,1100,768]){
  await page.setViewportSize({width,height:960});
  const boxes=await page.locator('.tree-brand,.tree-canvas-actions,.tree-resource-actions,.tree-tool-actions').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(Math.min(boxes[i].right,boxes[j].right)-Math.max(boxes[i].x,boxes[j].x)<1||Math.min(boxes[i].bottom,boxes[j].bottom)-Math.max(boxes[i].y,boxes[j].y)<1,'header overlap at '+width);
  assert.ok(await appearance.isVisible());
 }
 await page.setViewportSize({width:768,height:960});await open();await theme.selectOption('light');
 await page.locator('#appearance-hex').fill('invalid');await page.locator('[data-save]').click();assert.ok(await page.locator('.appearance-dialog').isVisible());
 await page.locator('[data-reset]').click();assert.equal(await page.locator('#appearance-hex').inputValue(),'#3866AF');
 await page.screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-settings-english.png',output))});
 await page.setViewportSize({width:320,height:800});assert.ok(await page.locator('.appearance-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.locator('[data-save]').scrollIntoViewIfNeeded();await page.locator('[data-save]').click();await page.setViewportSize({width:768,height:960});await open();
 await page.locator('[data-save]').click();await page.locator('#open-graphics-library').click();await page.locator('.graphics-card').first().waitFor();
 assert.equal(await page.locator('.graphics-dialog').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
 await page.screenshot({path:fileURLToPath(new URL((built?'built':'source')+'-library-light.png',output))});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({built,pass:true,checks:['live preview','custom accent','canvas/storage/history isolation','18 theme/style/density combinations','saved style/density restoration','cancel','system changes','English header 1600/1100/768','320px dialog','hex validation','library surfaces'],errors}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
