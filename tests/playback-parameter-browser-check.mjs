import {withPagesAssets} from './helpers/pages-assets.mjs';
// Isolated browser regression: editing parameters must not interrupt playback.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';

const built=process.argv.includes('--built'),root=resolve('web');
const server=createServer(withPagesAssets(async(req,res)=>{try{
 const name=new URL(req.url,'http://local').pathname,file=name==='/built.html'?resolve('site/index.html'):resolve(root,'.'+(name==='/'?'/index.html':name));
 if(name!=='/built.html'&&!file.startsWith(root+sep))throw Error();
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}}));
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1550,height:1050}}),errors=[],checks=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 const p=project();p.root.children=[node('shape','Circle'),node('shape','Circle')];p.root.children.forEach((n,i)=>{n.name='Live '+i;n.color.mode='own';n.color.fill='solid';});p.output.seconds=60;
 p.root.children[1].tracks['transform.rotation']={mode:'absolute',ease:'linear',keys:[[0,0],[1,360]]};
 await page.goto('http://127.0.0.1:'+server.address().port+(built?'/built.html':'/')+'#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const play=page.locator('#play'),inspector=page.locator('#inspector'),tree=page.locator('#node-tree [role=treeitem]');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));
 const field=(path,type='number')=>inspector.locator('[data-parameter-path="'+path+'"] input[type='+type+']');
 const change=async(input,value,type='change')=>input.evaluate((e,{value,type})=>{e.focus();e.value=String(value);e.dispatchEvent(new Event(type,{bubbles:true}));},{value,type});
 async function advancing(label){
  assert.equal(await play.getAttribute('aria-pressed'),'true',label+' playing');
  const t=await page.locator('#tree-time').inputValue();
  await page.waitForFunction(t=>Number(document.querySelector('#tree-time').value)!==Number(t),t);
  assert.equal(await play.getAttribute('aria-pressed'),'true',label+' still playing');checks.push(label);if(process.argv.includes('--trace'))console.log(label);
 }
 await tree.first().click();await play.click();await advancing('start');
 const original=p.root.children[0].params[0];
 await change(field('params.0','range'),.31,'input');await advancing('slider during drag');
 await change(field('params.0','range'),.42,'input');await advancing('slider second preview');
 await field('params.0','range').dispatchEvent('change');await advancing('slider commit');
 assert.equal((await saved()).root.children[0].params[0],.42);
 await page.locator('#undo').click();await advancing('slider single undo');assert.equal((await saved()).root.children[0].params[0],original);
 await page.locator('#redo').click();await advancing('slider redo');assert.equal((await saved()).root.children[0].params[0],.42);
 await change(field('params.0'),.36);await advancing('number commit');assert.equal((await saved()).root.children[0].params[0],.36);
 await inspector.locator('[data-reset-parameter="params.0"]').click();await advancing('reset parameter');
 const picker=inspector.locator('input[type=color]').first();await change(picker,'#ff5500','input');await advancing('color preview');await picker.dispatchEvent('change');await advancing('color commit');
 await change(inspector.locator('input[data-color-hex]').first(),'#55AAFF');await advancing('hex color');
 await inspector.locator('[data-animation-path="color.fill"][value=gradient]').check();await advancing('color mode switch');
 const gradient=inspector.locator('.gradient-editor input[type=color]');await change(gradient,'#aaff55','input');await advancing('gradient color preview');await gradient.dispatchEvent('change');await advancing('gradient color commit');
 await change(inspector.locator('.channel-curves-editor input[type=number]').last(),120);await advancing('channel curve edit');
 await page.locator('#inspector-tabs').getByRole('button',{name:'变换/排列',exact:true}).click();await change(field('transform.x'),.1);await advancing('transform parameter');
 const uvBefore=(await saved()).root.children[0].uv;
 await page.locator('#grab-uv').click();const canvas=await page.locator('#tree-canvas').boundingBox();
 await page.mouse.move(canvas.x+canvas.width/2,canvas.y+canvas.height/2);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width/2+20,canvas.y+canvas.height/2+12);await advancing('UV drag');await page.mouse.up();await advancing('UV commit');
 assert.notDeepEqual((await saved()).root.children[0].uv,uvBefore);await page.locator('#undo').click();assert.deepEqual((await saved()).root.children[0].uv,uvBefore);await advancing('UV single undo');await page.locator('#grab-uv').click();
 await change(page.locator('#canvas-background-color'),'#334455','input');await advancing('canvas background preview');await page.locator('#canvas-background-color').dispatchEvent('change');await advancing('canvas background commit');
 // Batch gestures keep their transaction boundary while the timeline advances.
 await tree.nth(1).click({modifiers:['Control']});
 await page.locator('#inspector-tabs').getByRole('button',{name:'图形',exact:true}).click();
 const beforeBatch=await saved();await change(field('params.0','range'),.28,'input');await advancing('batch slider preview');await change(field('params.0','range'),.32,'input');await field('params.0','range').dispatchEvent('change');await advancing('batch slider commit');
 assert.deepEqual((await saved()).root.children.map(n=>n.params[0]),[.32,.32]);
 await page.locator('#undo').click();assert.deepEqual((await saved()).root.children.map(n=>n.params[0]),beforeBatch.root.children.map(n=>n.params[0]));await advancing('batch single undo');
 await change(field('params.0'),.29);await advancing('batch numeric edit');
 // Explicit seeking still pauses. Recording while playing records at the live
 // cursor; a continuous drag, including its keys, remains one undo operation.
 await tree.first().click();await page.locator('#tree-time').evaluate(e=>{e.value='.1';e.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await play.getAttribute('aria-pressed'),'false');checks.push('explicit seek pauses');
 await page.getByRole('button',{name:'参数模式 ● 录制',exact:true}).click();await play.click();
 await change(field('params.0','range'),.21,'input');await advancing('recording live preview');
 await change(field('params.0','range'),.33,'input');await field('params.0','range').dispatchEvent('change');await advancing('recording live commit');
 const keys=(await saved()).root.children[0].tracks['params.0'].keys;assert.equal(keys.length,3);assert.equal(keys[0][0],0);assert.ok(keys[2][0]>keys[1][0]);assert.deepEqual(keys.slice(1).map(k=>k[1]),[.21,.33]);
 await page.locator('#undo').click();assert.equal((await saved()).root.children[0].tracks['params.0'],undefined);await advancing('recording single undo');
 await page.locator('#redo').click();assert.deepEqual((await saved()).root.children[0].tracks['params.0'].keys,keys);await advancing('recording redo');
 await page.getByRole('button',{name:'参数模式 ● 录制',exact:true}).click();await play.click();
 assert.equal(await field('params.0').isDisabled(),true);checks.push('animated parameter remains locked in normal mode');
 await page.getByRole('button',{name:'参数模式 基础值',exact:true}).click();await change(field('params.0'),.41);assert.equal((await saved()).root.children[0].params[0],.41);assert.deepEqual((await saved()).root.children[0].tracks['params.0'].keys,keys);checks.push('base value preserves keys');
 await page.getByRole('button',{name:'参数模式 基础值',exact:true}).click();await page.locator('#node-animation-editor').getByRole('button',{name:'进入选中节点',exact:true}).click();await play.click();await advancing('local scope playback');await change(field('params.1'),.03);await advancing('local scope parameter edit');assert.equal((await saved()).root.children[0].params[1],.03);
 assert.deepEqual(errors,[]);await mkdir('test-results/playback-parameters',{recursive:true});await writeFile('test-results/playback-parameters/'+(built?'built':'source')+'.json',JSON.stringify({checks,errors},null,2));
 console.log('Playback parameter browser PASS ('+(built?'built':'source')+'): '+checks.length+' checks.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
