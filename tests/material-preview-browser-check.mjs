// Cover hardware ANGLE/D3D11 as well as the software backend used by Edge CI.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {project,node} from '../web/tree-model.js';

const url=process.argv[2]??'http://127.0.0.1:8799/';
await mkdir('test-results/material-preview',{recursive:true});
for(const channel of ['chrome','msedge']){
 const browser=await chromium.launch({channel,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const p=project();p.root.children=[node('shape','WaterCaustics')];
  await page.goto(url+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
  await page.getByRole('combobox',{name:'预览模式',exact:true}).selectOption('material');
  await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('材质采样'));
  const dialog=page.locator('.tree-preview');
  assert.equal(await page.locator('#preview-error').isVisible(),false);
  assert.equal(await page.locator('#tree-preview-surface').isVisible(),false);
  assert.equal(await page.locator('#preview-2d-toolbar').isVisible(),false);
  const canvas=page.locator('#material-preview canvas'),pictures=[];
  for(const model of ['0','1','2']){
   await dialog.getByRole('combobox',{name:'预览模型'}).selectOption(model);
   const picture=await canvas.screenshot({path:'test-results/material-preview/'+channel+'-'+model+'.png'});
   assert.ok(picture.length>4000,channel+' model '+model+' is blank');
   for(const other of pictures)assert.notDeepEqual(picture,other,channel+' models must differ');
   pictures.push(picture);
  }
  const bump=dialog.getByRole('slider',{name:'凹凸强度',exact:true}),relief=dialog.getByRole('slider',{name:'视差深度',exact:true});
  assert.equal(await bump.inputValue(),'0');assert.equal(await relief.inputValue(),'0');
  const flat=await canvas.screenshot({path:'test-results/material-preview/'+channel+'-flat.png'});
  await bump.fill('1');const raised=await canvas.screenshot({path:'test-results/material-preview/'+channel+'-raised.png'});
  assert.notDeepEqual(raised,flat,channel+' explicit bump strength must change surface lighting');
  await bump.fill('0');assert.deepEqual(await canvas.screenshot(),flat,channel+' zero bump must restore flat pattern');
  await relief.fill('0.6');assert.notDeepEqual(await canvas.screenshot(),flat,channel+' explicit parallax must shift the pattern');
  await relief.fill('0');assert.deepEqual(await canvas.screenshot(),flat,channel+' zero parallax must restore flat pattern');
  await dialog.getByRole('slider',{name:'灯光方向',exact:true}).press('End');
  assert.notDeepEqual(await canvas.screenshot(),pictures[2],channel+' lighting must change');
  const bounds=await canvas.boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);
  await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.65,bounds.y+bounds.height*.6,{steps:8});await page.mouse.up();
  assert.notDeepEqual(await canvas.screenshot(),pictures[2],channel+' orbit must change');
  await dialog.getByRole('button',{name:'复位视角'}).click();
  await dialog.screenshot({path:'test-results/material-preview/'+channel+'-dialog.png'});
  await page.getByRole('combobox',{name:'预览模式',exact:true}).selectOption('canvas');
  await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('高清预览'));
  assert.equal(await page.locator('#tree-preview-surface').isVisible(),true);
  assert.equal(await page.locator('#preview-2d-toolbar').isVisible(),true);
  assert.equal(await canvas.isVisible(),false);
  await page.getByRole('combobox',{name:'预览模式',exact:true}).selectOption('material');
  await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('材质采样'));
  assert.equal(await page.getByRole('combobox',{name:'预览模型'}).inputValue(),'2');
  await page.getByRole('button',{name:'选择 动态焦散',exact:true}).click();
  const beforeEdit=await canvas.screenshot();
  const brightness=page.getByRole('spinbutton',{name:'亮度',exact:true});await brightness.fill('0.4');await brightness.press('Tab');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')).root.children[0].params[4]===.4);
  assert.notDeepEqual(await canvas.screenshot(),beforeEdit,channel+' parameter edits must update material');
  const atZero=await canvas.screenshot();
  await page.getByRole('slider',{name:'当前范围滑动进度',exact:true}).fill('0.5');
  await page.waitForFunction(()=>document.querySelector('#time-value').textContent==='0.500');
  assert.notDeepEqual(await canvas.screenshot(),atZero,channel+' time scrub must update material');
  await page.getByRole('button',{name:'播放',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('#time-value').textContent)>.55);
  await page.getByRole('button',{name:'暂停',exact:true}).click();
  assert.equal(await page.locator('#preview-error').isVisible(),false);
  const {readFile}=await import('node:fs/promises');
  const exportPNG=async()=>{const pending=page.waitForEvent('download');await page.locator('#export-now').click();await page.locator('#confirm-export').click();const download=await pending;assert.equal(await download.failure(),null);await page.locator('#close-global').click();return readFile(await download.path());};
  const materialPNG=await exportPNG();
  await page.getByRole('combobox',{name:'预览模式',exact:true}).selectOption('canvas');
  assert.deepEqual(await exportPNG(),materialPNG,channel+' preview mode must not change exported pixels');
  // Saving still serializes the canvas, without preview mode or view lighting.
  const save=page.waitForEvent('download');await page.locator('#save-project').evaluate(button=>button.click());
  const downloaded=await save;
  const {readResourcePack}=await import('../web/resource-pack.js');
  const saved=(await readResourcePack(await readFile(await downloaded.path()))).payload;
  assert.equal(saved.output.mode,'color');assert.equal(saved.root.children[0].type,'WaterCaustics');assert.equal(saved.root.children[0].params[4],.4);
  assert.equal(saved.previewMode,undefined);assert.equal(saved.output.metallic,undefined);
  assert.deepEqual(errors,[]);
  const report={channel,models:3,flatDefault:true,optionalBump:true,optionalParallax:true,lighting:true,orbit:true,reopen:true,liveTime:true,liveParameters:true,canvasPreserved:true,exportUnchanged:true,errors};
  await writeFile('test-results/material-preview/'+channel+'.json',JSON.stringify(report,null,2));console.log(report);
 }finally{await browser.close();}
}
