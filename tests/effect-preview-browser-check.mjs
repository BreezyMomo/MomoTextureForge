import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
const standalone=process.argv.includes('--standalone'),root=resolve('web'),server=createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://local').pathname,file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',standalone?'text/html; charset=utf-8':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');res.end(await readFile(standalone?'site/index.html':file));}catch{res.writeHead(404);res.end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 await mkdir('test-results/effect-preview',{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port;
 if(!standalone){
  await page.goto(origin+'/authoring-render.html');await page.addStyleTag({path:resolve('web/tree.css')});
  const pixels=await page.evaluate(async()=>{
   const {createEffectPreview}=await import('./effect-preview.js'),host=document.createElement('div'),controls=document.createElement('div');host.style.cssText='width:640px;height:400px;display:flex';document.body.append(host,controls);
   const preview=createEffectPreview(host,{controls}),source=document.createElement('canvas');source.width=source.height=1;source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray([200,100,50,128]),1,1),0,0);
   const change=(label,value,event='change')=>{const input=controls.querySelector('[aria-label="'+label+'"]');input.value=value;input.dispatchEvent(new Event(event));};
   const center=mode=>{const c=host.querySelector('[data-blend="'+mode+'"] canvas');return Array.from(c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data);};
   try{change('特效预览背景','custom');change('特效预览背景色','#204060','input');preview.update(source);const normal=center('alpha'),add=center('add');change('预览亮度','0','input');const zeroAlpha=center('alpha'),zeroAdd=center('add');change('特效预览背景','compare');const count=host.querySelectorAll('canvas').length;return {normal,add,zeroAlpha,zeroAdd,count,portrait:preview.sampleSize(.5),wide:preview.sampleSize(2),quick:preview.sampleSize(1,true)};}finally{preview.destroy();host.remove();controls.remove();}
  });
  for(const [key,expected]of Object.entries({normal:[116,82,73,255],add:[132,114,121,255],zeroAlpha:[16,32,48,255],zeroAdd:[32,64,96,255]}))assert.ok(pixels[key].every((v,i)=>Math.abs(v-expected[i])<=2),key+': '+pixels[key]);assert.equal(pixels.count,4);assert.deepEqual(pixels.portrait,{width:256,height:512});assert.deepEqual(pixels.wide,{width:512,height:256});assert.deepEqual(pixels.quick,{width:256,height:256});
 }
 const p=project(),n=node('shape','Circle');n.color={mode:'own',fill:'solid',low:'#e8a04d',high:'#e8a04d'};n.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,.25],[1,.85]]};p.root.children=[n];p.output.alpha=false;p.output.background='#ff00ff';p.output.width=p.output.height=64;
 await page.goto(origin+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));await page.reload();await page.locator('#open-graphics-library').waitFor();await page.locator('#project-name').fill('特效预览隔离测试');await page.locator('#project-name').press('Tab');
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))),saved=()=>page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),before=await saved();
 async function png(name){await page.locator('#export-now').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#confirm-export').click()]);const path='test-results/effect-preview/'+name+(standalone?'-standalone':'')+'.png';await download.saveAs(path);await page.locator('#close-global').click();const bytes=[...await readFile(path)];return page.evaluate(async bytes=>{const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;c.getContext('2d').drawImage(bitmap,0,0);bitmap.close();return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);},bytes);}
 const exportedBefore=await png('before');assert.deepEqual(exportedBefore.slice(0,4),[255,0,255,255]);
 await page.locator('#preview-mode').selectOption('effect');await page.waitForFunction(()=>document.querySelectorAll('#effect-preview canvas').length===2);await frame();assert.equal(await page.locator('#tree-preview-surface').isVisible(),false);assert.equal(await page.locator('#preview-2d-toolbar').isVisible(),false);
 const effectPixels=()=>page.locator('#effect-preview canvas').first().evaluate(c=>c.toDataURL()),initial=await effectPixels();
 await page.getByRole('combobox',{name:'特效预览背景',exact:true}).selectOption('compare');assert.equal(await page.locator('#effect-preview canvas').count(),4);
 await page.getByRole('slider',{name:'预览亮度',exact:true}).fill('1.5');await page.getByRole('slider',{name:'显示大小',exact:true}).fill('0.6');assert.notEqual(await effectPixels(),initial);assert.equal(await saved(),before);
 await page.locator('#tree-time').fill('0.75');await frame();const advanced=await effectPixels();await page.locator('#tree-time').fill('0');await frame();assert.notEqual(await effectPixels(),advanced);assert.equal(await saved(),before);
 // The display panels must never bake their scene, brightness or scale into PNG output.
 const exportedAfter=await png('after');assert.deepEqual(exportedAfter,exportedBefore);assert.equal(await saved(),before);
 await page.locator('#preview-mode').selectOption('canvas');await frame();assert.equal(await page.locator('#tree-preview-surface').isVisible(),true);await page.locator('#preview-mode').selectOption('material');await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('材质采样'));assert.equal(await page.locator('#material-preview').isVisible(),true);
 await page.locator('#preview-mode').selectOption('effect');assert.equal(await page.getByRole('combobox',{name:'特效预览背景',exact:true}).inputValue(),'compare');await page.getByRole('button',{name:'复位特效预览',exact:true}).click();assert.equal(await page.locator('#effect-preview canvas').count(),2);assert.equal(await saved(),before);
 await page.setViewportSize({width:1280,height:900});await frame();assert.ok(await page.locator('#effect-preview canvas').first().evaluate(c=>c.width>0&&c.height>0));await page.screenshot({path:'test-results/effect-preview/editor'+(standalone?'-standalone':'')+'.png'});
 assert.deepEqual(errors,[]);console.log({standalone,blendPixels:true,sharedFrame:true,animated:true,viewOnly:true,pngUnchanged:true,modeSwitching:true,resize:true,errors});
}finally{await browser?.close();await new Promise(r=>server.close(r));}
