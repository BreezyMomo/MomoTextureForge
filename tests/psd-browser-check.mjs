import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const require=createRequire(resolve(process.argv[2],'package.json'));
const {chromium}=require('playwright');
const out=resolve(process.argv[3]??'test-results/psd');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://127.0.0.1:8799/');
 await page.waitForFunction(()=>document.getElementById('render-status')?.textContent?.includes('ms'));
 const results=await page.evaluate(async()=>{
  const {project,node}=await import('./tree-model.js'),{TreeRenderer}=await import('./tree-renderer.js'),{exportPSD}=await import('./tree-psd.js'),{exportContourPSD}=await import('./tree-psd-contours.js'),{encodePNG}=await import('./encoders.js');
  const r=new TreeRenderer(document.createElement('canvas'));
  const solid=(type,name,color)=>{const n=node('shape',type);n.name=name;n.color={mode:'own',fill:'solid',high:color,low:color};return n;};
  const base=project(),group=node('group');group.name='可编辑形状';
  const a=solid('Circle','红色圆形','#f06464');a.transform={...a.transform,x:.32,y:.6,width:.55,height:.6,rotation:23};
  const b=solid('Ring','蓝色圆环','#458dff');b.transform={...b.transform,x:.64,y:.38,width:.55,height:.7,rotation:-37,fit:'contain'};b.opacity=.65;
  group.children=[a,b];base.root.children=[group];base.output.width=256;base.output.height=256;
  const masked=structuredClone(base);masked.root.children[0].children[1].blend='inverseMask';masked.root.children.push(solid('Ellipse','独立椭圆','#52cb84'));
  const complex=structuredClone(base);complex.root.children[0].transform.rotation=25;complex.root.children[0].opacity=.6;const noise=node('shape','FBM');noise.name='程序化噪声';noise.opacity=.3;complex.root.children.push(noise);
  const gradient=structuredClone(base);gradient.root.children[0].children[0].color.fill='gradient';gradient.root.children[0].children[0].color.low='#000000';gradient.output.alpha=false;gradient.output.background='#28364b';
  const hdr=structuredClone(base);hdr.root.children[0].children[1].blend='add';hdr.root.children[0].children.push({...solid('Circle','覆盖层','#000000'),opacity:.7});
  const nodeMask=structuredClone(base);nodeMask.root.children[0].children[0].mask=solid('Circle','旧式节点蒙版','#ffffff');nodeMask.root.children[0].children[0].mask.transform.x=.7;nodeMask.root.children[0].children[0].mask.params[3]=.05;nodeMask.root.children[0].children[0].maskInvert=true;
  const timed=structuredClone(base);timed.root.children[0].timing={...timed.root.children[0].timing,from:.1,to:.7};timed.root.children[0].children[0].tracks['transform.x']={mode:'absolute',ease:'linear',keys:[[0,.1],[1,.9]]};timed.root.children[0].children[1].enabled=false;
  const normal=structuredClone(base);normal.output.mode='normal';
  const empty=structuredClone(base);empty.root.children=[];
  const encode=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
  const results=[];for(const [name,p]of [['vector-shapes',base],['inverse-mask',masked],['complex-group',complex],['opaque-background',gradient],['hdr-add',hdr],['node-mask',nodeMask],['timing-hidden',timed],['normal-output',normal],['empty-canvas',empty]]){
   const w=256,h=256,pixels=r.draw(p,w,h,{time:.35,read:true}),res=await exportPSD(p,{time:.35,width:w,height:h,render:(p,w,h,t)=>r.draw(p,w,h,{time:t,read:true})});
   results.push({name,psd:encode(res.bytes),png:encode(await encodePNG(pixels,w,h,8)),stats:res.stats,warnings:res.warnings});
  }
  const outlines=project(),set=node('group');set.name='程序化矢量轮廓';set.children=['Star','Ring','RoundedRect','FBM'].map((type,i)=>{const n=solid(type,type,'#'+['f06464','458dff','52cb84','e6b950'][i]);n.transform={...n.transform,x:i%2?.75:.25,y:i<2?.75:.25,width:.42,height:.42};n.params[3]=.06;return n;});outlines.root.children=[set];
  const thin=structuredClone(base);thin.root.children[0].children[1].params[1]=.001;
  for(const [name,p,threshold,smooth]of [['contour-feather-zero',outlines,0],['contour-feather-half',outlines,.5],['contour-mask',masked,0],['contour-complex',complex,0],['contour-background',gradient,0],['contour-smooth-shapes',base,0,true],['contour-smooth-corners',outlines,0,true],['contour-smooth-mask',masked,0,true],['contour-smooth-thin',thin,0,true]]){
   const w=256,h=256,res=await exportContourPSD(p,{time:.35,width:w,height:h,threshold,smooth,render:(p,w,h,t)=>r.draw(p,w,h,{time:t,read:true})}),pix=Float32Array.from(res.imageData.data,x=>x/255);
   results.push({name,psd:encode(res.bytes),png:encode(await encodePNG(pix,w,h,8)),stats:res.stats,warnings:res.warnings});
  }r.destroy();return results;
 });
 for(const r of results){await writeFile(resolve(out,r.name+'.psd'),Buffer.from(r.psd,'base64'));await writeFile(resolve(out,r.name+'.png'),Buffer.from(r.png,'base64'));delete r.psd;delete r.png;}
 assert.ok(results.find(r=>r.name==='contour-smooth-shapes').stats.smoothed>0);
 await writeFile(resolve(out,'browser-results.json'),JSON.stringify(results,null,2));
 // Exercise the actual editor export controls and a real browser download.
 await page.locator('#export-now').click();await page.getByLabel('导出类型',{exact:true}).selectOption('psd');
 assert.equal(await page.getByLabel('PNG精度',{exact:true}).count(),0);
 const downloadPromise=page.waitForEvent('download');await page.locator('#confirm-export').click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.psd'));await download.saveAs(resolve(out,'editor-export.psd'));
 await page.getByLabel('导出类型',{exact:true}).selectOption('psd-vector');assert.equal(await page.getByLabel('轮廓透明度阈值',{exact:true}).inputValue(),'50');assert.equal(await page.getByLabel('输出内容',{exact:true}).count(),0);assert.equal(await page.getByLabel('轮廓平滑',{exact:true}).isChecked(),true);
 const before=await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),vectorDownload=page.waitForEvent('download');await page.locator('#confirm-export').click();await (await vectorDownload).saveAs(resolve(out,'editor-vector.psd'));assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),before);
 await page.getByLabel('轮廓平滑',{exact:true}).uncheck();assert.equal(await page.getByLabel('轮廓平滑',{exact:true}).isChecked(),false);const sharpDownload=page.waitForEvent('download');await page.locator('#confirm-export').click();await (await sharpDownload).saveAs(resolve(out,'editor-vector-sharp.psd'));await page.getByLabel('轮廓平滑',{exact:true}).check();assert.equal(await page.evaluate(()=>localStorage.getItem('momo-texture-tree:draft:v1')),before);
 await page.screenshot({path:resolve(out,'export-panel.png'),fullPage:true});
 const offline=await browser.newPage();const external=[];offline.on('request',req=>{if(/^https?:/.test(req.url()))external.push(req.url());});
 await offline.goto(pathToFileURL(resolve('dist/MomoTextureForge.html')).href);await offline.waitForFunction(()=>document.getElementById('render-status')?.textContent?.includes('ms'));
 await offline.locator('#export-now').click();await offline.getByLabel('导出类型',{exact:true}).selectOption('psd');const offlineDownload=offline.waitForEvent('download');await offline.locator('#confirm-export').click();await (await offlineDownload).saveAs(resolve(out,'offline-export.psd'));assert.deepEqual(external,[]);
 await offline.getByLabel('导出类型',{exact:true}).selectOption('psd-vector');const offlineVector=offline.waitForEvent('download');await offline.locator('#confirm-export').click();await (await offlineVector).saveAs(resolve(out,'offline-vector.psd'));assert.deepEqual(external,[]);
 console.log(JSON.stringify({out,results,download:download.suggestedFilename()},null,2));
}finally{await browser.close();}
