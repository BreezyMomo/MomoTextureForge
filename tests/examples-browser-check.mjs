import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {sanitizeTree} from '../web/tree-model.js';
import {treeSamples} from '../web/tree-samples.js';
import {effectSamples} from '../web/effect-samples.js';
const sampleCount=treeSamples().length;
const editableNames=process.argv.includes('--effects-only')?new Set(effectSamples().map(s=>s.name)):null;

const standalone=process.argv.includes('--standalone'),root=resolve('web');
const server=http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname,file=standalone?resolve('site/index.html'):resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!standalone&&!file.startsWith(root+sep))throw Error('Invalid path');
  res.setHeader('Content-Type',standalone?'text/html':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1400,height:1150}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+(standalone?'/?view=examples':'/examples.html'));
 await page.waitForFunction(count=>document.querySelector('#status')?.textContent.includes(count+' 种组合示例已生成'),sampleCount,{timeout:180000});
 assert.equal(await page.locator('#samples article').count(),sampleCount);
 const links=await page.locator('#samples article a').evaluateAll(links=>links.map(a=>a.href));
 const names=new Set();
 for(const href of links){
  const url=new URL(href);assert.equal(url.origin,origin);
  const project=sanitizeTree(JSON.parse(Buffer.from(url.hash.slice(6),'base64').toString('utf8')));
  if(editableNames&&!editableNames.has(project.name))continue;
  const root=project.root.children[0];assert.ok(root.kind==='shape'?root.arrange[0]>0||Object.values(root.postEffects).some(effect=>effect.enabled===true):root.children.length>=2);names.add(project.name);
  if(['刀光拖尾','命中爆闪','破碎冲击环','溶解遮罩'].includes(project.name))assert.equal(project.output.loopExport,false,project.name);
  if(project.name==='溶解遮罩'){assert.equal(project.output.mode,'height');assert.equal(project.output.alpha,false);}
  if(['菱形格纹','交错菱砖','斜纹底纹','点阵底纹'].includes(project.name)){assert.equal(project.output.mode,'color');assert.equal(project.output.alpha,false);}
  const editor=await browser.newPage();
  try{
   editor.on('pageerror',e=>errors.push(e.message));await editor.goto(href);
   await editor.waitForFunction(()=>{const s=document.querySelector('#render-status');return s&&s.textContent.includes('预览')&&!s.textContent.includes('加载');});
   assert.equal(await editor.locator('#project-name').inputValue(),project.name);
   assert.equal(await editor.locator('#preview-error').isVisible(),false,project.name);
   if(url.searchParams.has('preview-time'))assert.equal(Number(await editor.locator('#tree-time').inputValue()),Number(url.searchParams.get('preview-time')),project.name+' opens at its visible preview frame');
   if(project.name==='手绘心形'){assert.equal(root.type,'HeartLeafTeardrop');assert.equal(root.postEffects.sketch.enabled,true);assert.equal(root.postEffects.sketch.fillStyle,3);assert.equal(root.postEffects.sketch.fillColor,'#f42521');await editor.locator('.tree-node-name').filter({hasText:'手绘心形'}).click();await editor.locator('#inspector-tabs').getByRole('button',{name:'合成',exact:true}).click();const effects=editor.locator('#inspector [data-module="modules.imageFilters"]');if(await effects.getAttribute('open')===null)await effects.locator(':scope>summary .inspector-module-title').click();assert.equal(await effects.locator('[data-effect=sketch] [data-effect-enabled]').isChecked(),true);assert.equal(await effects.locator('[data-effect=sketch] select').first().inputValue(),'3');}
   assert.ok(await editor.locator('[role="treeitem"]').count()>=(root.kind==='shape'?1:2));
  }finally{await editor.close();}
 }
 assert.equal(names.size,editableNames?.size??sampleCount);assert.deepEqual(errors,[]);
 await page.locator('#samples img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 const shieldPixels=await page.locator('img[alt="蜂巢护盾"]').evaluate(img=>{
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
  let outside=0,inside=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const radius=Math.hypot((x+.5)/canvas.width-.5,(y+.5)/canvas.height-.5),alpha=data[(y*canvas.width+x)*4+3];
   if(alpha>10){if(radius>.45)outside++;if(radius<.35)inside++;}
  }
  return {outside,inside};
 });
 const heartPixels=await page.locator('img[alt="手绘心形"]').evaluate(img=>{const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let red=0,ink=0,paper=0;for(let i=0;i<data.length;i+=4){if(data[i]>150&&data[i+1]<150&&data[i+2]<150)red++;if(Math.max(data[i],data[i+1],data[i+2])<100)ink++;if(Math.min(data[i],data[i+1],data[i+2])>240)paper++;}return {red,ink,paper};});
 assert.ok(heartPixels.red>500,'手绘心形保留红色交叉排线');assert.ok(heartPixels.ink>100,'手绘心形保留深色轮廓');assert.ok(heartPixels.paper>5000,'手绘心形保留白色纸面和排线间隙');
 assert.equal(shieldPixels.outside,0,'蜂巢不得超出圆形护盾边界');assert.ok(shieldPixels.inside>100,'圆内保留蜂巢纹样');
 await mkdir('test-results/examples',{recursive:true});if(!process.argv.includes('--no-screenshots'))await page.screenshot({path:'test-results/examples/gallery.png',fullPage:true});
 if(!standalone){
  const frames=await page.evaluate(async()=>{
   const {TreeRenderer}=await import('./tree-renderer.js'),{treeSamples}=await import('./tree-samples.js'),{project,cloneNode,sanitizeTree}=await import('./tree-model.js'),{encodePNG}=await import('./encoders.js');
   const renderer=new TreeRenderer(document.createElement('canvas')),results=[];
   const sheet=document.createElement('section');sheet.id='animation-check';sheet.style.cssText='background:#161920;padding:20px;width:800px';
   try{
    for(const sample of treeSamples().slice(0,5)){
     const raw=project();raw.name=sample.name;raw.root.children=[cloneNode(sample.root)];Object.assign(raw.output,sample.output);const p=sanitizeTree(raw);
     const row=document.createElement('div');row.style.cssText='display:flex;gap:12px;align-items:center;color:white';row.textContent=sample.name;sheet.append(row);
     const stats=[];let start;
     for(const time of [0,.3,.65,1]){
      const pixels=renderer.draw(p,128,128,{time,read:true}),bytes=await encodePNG(pixels,128,128);
      const img=new Image();img.src=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));await img.decode();
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,128,128).data;
      let energy=0,alphaMin=255,grayError=0,difference=0;
      for(let i=0;i<data.length;i+=4){energy+=data[i]*data[i+3]/65025;alphaMin=Math.min(alphaMin,data[i+3]);grayError=Math.max(grayError,Math.abs(data[i]-data[i+1]),Math.abs(data[i]-data[i+2]));if(start)for(let j=0;j<4;j++)difference+=Math.abs(start[i+j]-data[i+j]);}
      stats.push({time,energy:energy/(128*128),alphaMin,grayError,difference:difference/(data.length*255)});if(!start)start=data;
      const frame=document.createElement('div');frame.style.cssText='background:#000;text-align:center';img.width=img.height=128;frame.append(img,document.createElement('br'),String(time));row.append(frame);
     }
     results.push({name:sample.name,stats});
    }
   }finally{renderer.destroy();}
   document.body.prepend(sheet);return results;
  });
  for(const {name,stats}of frames){
   assert.ok(stats[1].energy>.001,name+' 中间帧应有内容');
   if(name==='能量旋涡'){assert.ok(stats[1].difference>.001,'旋涡应有运动');assert.ok(stats[3].difference<.005,'旋涡首尾应衔接');}
   else{assert.ok(stats[0].energy>.001,name+' 起始帧可见');assert.ok(stats[3].energy<.001,name+' 结束应消退');}
   if(name==='溶解遮罩')assert.ok(stats[0].energy>.99,'溶解从完整白色开始');
   if(name==='溶解遮罩')for(const frame of stats){assert.equal(frame.alphaMin,255,'黑白遮罩应不透明');assert.equal(frame.grayError,0,'黑白遮罩通道一致');}
  }
  if(!process.argv.includes('--no-screenshots'))await page.locator('#animation-check').screenshot({path:'test-results/examples/animation-frames.png'});
  console.log(JSON.stringify({animationFrames:frames}));
  const tiles=await page.evaluate(async()=>{
   const {TreeRenderer}=await import('./tree-renderer.js'),{treeSamples}=await import('./tree-samples.js'),{project,cloneNode,sanitizeTree}=await import('./tree-model.js'),{encodePNG}=await import('./encoders.js');
   const renderer=new TreeRenderer(document.createElement('canvas')),results=[],sheet=document.createElement('section');sheet.id='ui-check';sheet.style.cssText='background:#15171c;padding:20px;width:920px;display:grid;grid-template-columns:1fr 1fr;gap:20px';
   try{
    for(const sample of treeSamples().filter(s=>s.category==='ui')){
     const raw=project();raw.root.children=[cloneNode(sample.root)];Object.assign(raw.output,sample.output);const p=sanitizeTree(raw),pixels=renderer.draw(p,128,128,{read:true,time:0}),last=renderer.draw(p,128,128,{read:true,time:1});
     let staticError=0,alphaError=0,wrapError=0;const colors=new Set();
     for(let i=0;i<pixels.length;i++){staticError=Math.max(staticError,Math.abs(pixels[i]-last[i]));if(i%4===3)alphaError=Math.max(alphaError,Math.abs(1-pixels[i]));}
     for(let i=0;i<pixels.length;i+=4)colors.add([pixels[i],pixels[i+1],pixels[i+2]].map(v=>Math.round(v*255)).join(','));
     const shifted=structuredClone(p);for(const layer of shifted.root.children[0].children){layer.arrange[13]+=17/128;layer.arrange[14]+=11/128;}
     const moved=renderer.draw(shifted,128,128,{read:true,time:0});
     for(let y=0;y<128;y++)for(let x=0;x<128;x++)for(let c=0;c<3;c++)wrapError+=Math.abs(moved[(y*128+x)*4+c]-pixels[(((y+11)%128)*128+(x-17+128)%128)*4+c]);
     results.push({name:sample.name,staticError,alphaError,wrapError:wrapError/(128*128*3),colors:colors.size});
     const url=URL.createObjectURL(new Blob([await encodePNG(pixels,128,128)],{type:'image/png'})),card=document.createElement('div'),title=document.createElement('h2');title.textContent=sample.name+' · 2 × 2 平铺';card.append(title);
     const preview=document.createElement('div');preview.style.cssText='width:440px;height:440px;background-image:url("'+url+'");background-size:220px 220px';card.append(preview);sheet.append(card);
    }
   }finally{renderer.destroy();}
   document.body.prepend(sheet);return results;
  });
  assert.equal(tiles.length,4);
  for(const tile of tiles){assert.ok(tile.colors>=3,tile.name+' 应包含底纹');assert.ok(tile.staticError<.0001,tile.name+' 应保持静态');assert.ok(tile.alphaError<.0001,tile.name+' 默认不透明');assert.ok(tile.wrapError<.005,tile.name+' 跨边缘排列应与整图循环平移一致');}
  if(!process.argv.includes('--no-screenshots'))await page.locator('#ui-check').screenshot({path:'test-results/examples/ui-tiles.png'});console.log({uiTiles:tiles});
 }
 await page.goto(origin);if(standalone)await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');else await page.locator('#render-status').waitFor();
 await page.locator('.header-help > summary').click();
 const help=page.locator('#detailed-help');assert.equal(await help.getAttribute('href'),'https://github.com/BreezyMomo/MomoTextureForge/blob/main/README.md');
 assert.equal(await help.getAttribute('target'),'_blank');assert.match(await help.getAttribute('rel'),/noopener/);
 const order=await page.locator('.header-help .header-dropdown-panel').evaluate(e=>[...e.children].map(c=>c.id));assert.equal(order.indexOf('detailed-help'),order.indexOf('tool-help')+1);
 console.log({standalone,examples:[...names],editableLinks:true,detailedHelp:true,errors});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
