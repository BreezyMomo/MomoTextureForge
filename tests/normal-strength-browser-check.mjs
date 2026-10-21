import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {project,node} from '../web/tree-model.js';

const root=resolve('web'),server=createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error('Invalid path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const p=project();p.name='法线强度拖动回归';const gradient=node('shape','LinearGradient');gradient.params[0]=1.5;p.root.children=[gradient];
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/#tree='+Buffer.from(JSON.stringify(p)).toString('base64'));
 await page.locator('#render-status').waitFor();
 // A smooth slope must generate the same direction at interaction, full-quality and export sizes.
 const samples=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node}=await import('./tree-model.js');
  const p=project(),n=node('shape','LinearGradient');n.params[0]=1.5;p.root.children=[n];p.output.mode='normal';p.output.normal=12;
  const renderer=new TreeRenderer(document.createElement('canvas')),result=[];
  try{for(const algorithm of ['sobel','scharr'])for(const smooth of [0,2])for(const [w,h]of [[192,192],[384,384],[512,512],[1024,1024],[384,192],[768,384]]){
   p.output.normalAlgorithm=algorithm;p.output.normalSmooth=smooth;p.canvas.ratio=w/h;
   const data=renderer.draw(p,w,h,{read:true,quality:1}),at=(Math.floor(h/2)*w+Math.floor(w/2))*4;result.push({algorithm,smooth,w,h,normal:Array.from(data.slice(at,at+3))});
  }}finally{renderer.destroy();}return result;
 });
 for(const sample of samples){const reference=samples.find(s=>s.algorithm===sample.algorithm&&s.smooth===sample.smooth&&s.w===512);assert.ok(sample.normal.every((v,i)=>Math.abs(v-reference.normal[i])<.001),'normal direction must survive sampling size changes: '+JSON.stringify(sample));}
 const material=await page.evaluate(async()=>{
  const {createMaterialPreview}=await import('./material-preview.js'),{project,node}=await import('./tree-model.js');
  const host=document.createElement('div'),controls=document.createElement('div');host.style.cssText='position:absolute;width:360px;height:300px;top:0;left:0';document.body.append(host,controls);
  const p=project(),n=node('shape','LinearGradient');n.params[0]=1.5;p.root.children=[n];p.output.mode='normal';p.output.normal=12;
  const preview=createMaterialPreview(host,{controls});
  const pixels=quick=>{preview.update(p,{quick});const c=host.querySelector('canvas'),gl=c.getContext('webgl2'),data=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
  try{const select=controls.querySelector('select');select.value='1';select.dispatchEvent(new Event('change'));const quick=pixels(true),full=pixels(false);let difference=0;for(let i=0;i<quick.length;i++)difference+=Math.abs(quick[i]-full[i]);return {difference:difference/quick.length,visible:full.some((v,i)=>i%4!==3&&v>0)};}finally{preview.destroy();host.remove();controls.remove();}
 });
 assert.ok(material.visible);assert.ok(material.difference<1,'3D lighting must remain stable when releasing the slider: '+material.difference);
 const waitFrame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.locator('#preview-channel').selectOption('normal');
 const settings=page.locator('#normal-preview-settings'),strength=()=>settings.getByRole('spinbutton',{name:'法线强度',exact:true});
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')).output);
 for(const mode of ['canvas','material']){
  await page.locator('#preview-mode').selectOption(mode);
  if(mode==='material')await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('384 × 384'));
  for(const label of ['法线强度','法线预平滑']){
   const slider=settings.getByRole('slider',{name:label+'滑动条',exact:true}),bounds=await slider.boundingBox();
   await page.mouse.move(bounds.x+bounds.width*.2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.6,bounds.y+bounds.height/2,{steps:3});
   const input=settings.getByRole('spinbutton',{name:label,exact:true}),dragValue=Number(await input.inputValue());assert.ok(dragValue>0);
   await page.mouse.up();await waitFrame();assert.equal(Number(await settings.getByRole('spinbutton',{name:label,exact:true}).inputValue()),dragValue,label+' must remain after release');
   const key=label==='法线强度'?'normal':'normalSmooth';assert.equal((await saved())[key],dragValue);
   await page.locator('#undo').click();await waitFrame();await page.locator('#redo').click();await waitFrame();assert.equal((await saved())[key],dragValue,label+' redo must restore committed value');
  }
 }
 const expected=await saved();await page.goto(origin);await page.locator('#preview-channel').selectOption('normal');assert.equal(Number(await strength().inputValue()),expected.normal);assert.equal(Number(await settings.getByRole('spinbutton',{name:'法线预平滑',exact:true}).inputValue()),expected.normalSmooth);
 assert.deepEqual(errors,[]);await mkdir('test-results/normal-strength',{recursive:true});await page.locator('.tree-preview').screenshot({path:'test-results/normal-strength/committed.png'});
 console.log({resolutionSamples:samples.length,material,dragRelease:true,undoRedo:true,reload:true,errors});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
