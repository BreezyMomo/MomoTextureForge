import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {project,node} from '../web/tree-model.js';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const p=project();p.name='体积火焰预览';p.root.children=[node('shape','VolumeFlame')];
 await page.goto('http://127.0.0.1:8799/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
 await page.locator('[role=treeitem]').first().click();await page.getByRole('button',{name:'合成',exact:true}).click();
 await page.getByText('后处理：亮度、色阶与反相',{exact:true}).click();
 const bloom=page.getByRole('spinbutton',{name:'Bloom 强度',exact:true});await bloom.fill('.8');await bloom.press('Tab');
 await page.getByRole('spinbutton',{name:'色散距离',exact:true}).fill('2');await page.getByRole('spinbutton',{name:'色散距离',exact:true}).press('Tab');
 await mkdir('test-results/expansion',{recursive:true});await page.screenshot({path:'test-results/expansion/workspace.png'});
 await page.locator('#project-settings').click();await page.getByRole('combobox',{name:'输出内容',exact:true}).selectOption('normal');
 await page.getByRole('combobox',{name:'法线算法',exact:true}).selectOption('scharr');await page.getByRole('checkbox',{name:'翻转法线 Y',exact:true}).check();
 await page.locator('#close-global').click();await page.getByRole('combobox',{name:'预览模式',exact:true}).selectOption('material');await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('材质采样'));
 const d=page.locator('.tree-preview');await d.screenshot({path:'test-results/expansion/material-ui.png'});
 for(const value of ['1','2','0'])await d.getByRole('combobox',{name:'预览模型'}).selectOption(value);
 await d.getByRole('slider',{name:'灯光方向',exact:true}).press('End');await page.getByRole('combobox',{name:'预览模式',exact:true}).selectOption('canvas');
 const download=page.waitForEvent('download');await page.locator('#export-now').click();await page.locator('#confirm-export').click();assert.equal(await (await download).failure(),null);
 assert.deepEqual(errors,[]);console.log({filterControls:true,normalControls:true,materialPreview:true,pngExport:true,errors});
}finally{await browser.close();}
