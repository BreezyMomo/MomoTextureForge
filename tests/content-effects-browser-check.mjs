import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const built=process.argv.includes('--built'),gpuOnly=process.argv.includes('--gpu-only'),uiOnly=process.argv.includes('--ui-only'),root=resolve('web');
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://local').pathname,file=path==='/built.html'?resolve('site/index.html'):resolve(root,'.'+(path==='/'?'/index.html':path));
 if(path!=='/built.html'&&!file.startsWith(root+sep))throw Error();
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[],origin='http://127.0.0.1:'+server.address().port;
 page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/authoring-render.html');
 const fixture=await page.evaluate(async()=>{
  const {imageAsset,encodeResourcePack}=await import('./resource-pack.js'),{registerAsset,prepareAsset,contentHash}=await import('./resource-assets.js'),{project,node}=await import('./tree-model.js'),{encodePNG}=await import('./encoders.js');
  const size=48,pixels=new Float32Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=x<4||y<4||x>43||y>43?0:1,v=(x%12<6)!==(y%12<6)?1:.15;pixels.set([v,.2+.6*y/size,.7,a],(y*size+x)*4);}
  const asset=await imageAsset(new File([await encodePNG(pixels,size,size)],'Content source.png',{type:'image/png'})),id='asset_'+await contentHash(asset);registerAsset(id,asset,await prepareAsset(asset));
  const p=project(),g=node('group');g.name='Content scene';g.children=[node('shape',id),node('shape','Star')];g.children[1].transform.width=g.children[1].transform.height=.45;p.root.children=[g];
  const bytes=await encodeResourcePack(p);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {pack:btoa(binary),imageId:id};
 });
 const gpu=built||uiOnly?{}:await page.evaluate(async imageId=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node,sanitizeTree,cloneNode}=await import('./tree-model.js'),{applyPostFx}=await import('./post-fx.js'),{contentEffectSamples}=await import('./content-effect-samples.js'),{encodeResourcePack,readResourcePack}=await import('./resource-pack.js'),{encodePNG}=await import('./encoders.js');
  const r=new TreeRenderer(document.createElement('canvas')),gl=r.gl,ids=['dissolve','shockwave','liquidFusion'];
  const check=(value,message)=>{if(!value)throw Error(message);};
  const diff=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(i%4===3?v-b[i]:v*a[i-i%4+3]-b[i]*b[i-i%4+3]),0)/a.length;
  const make=(type='Checker')=>{const p=project(),n=node('shape',type);n.shapeClock.follow=false;n.color={mode:'own',fill:'gradient',low:'#2853b4',high:'#ffe099'};p.root.children=[n];return p;};
  const enable=(n,id,values={})=>Object.assign(n.postEffects[id],{enabled:true,...values});
  const draw=(p,progress=.4,size=112,stream=false)=>{const a=r.draw(p,size,size,{time:progress,formulaSeconds:progress*3,read:true,quality:1,stream});check(a.every(Number.isFinite),'Nonfinite pixels');check(!gl.getError(),'GPU error');return a;};
  const read=target=>{gl.bindFramebuffer(gl.FRAMEBUFFER,target.fb);gl.readBuffer(gl.COLOR_ATTACHMENT0);const a=new Float32Array(target.w*target.h*4);gl.readPixels(0,0,target.w,target.h,gl.RGBA,gl.FLOAT,a);check(!gl.getError(),'Readback failed');return a;};
  // Raw targets expose premultiplied HDR and known height/color relationships.
  const raw=(id,values={},kind='gradient',boundary='clip',aspect=1)=>{
   const w=128,h=Math.round(w/aspect),source=r.target(w,h,false,aspect),data=new Float32Array(w*h*4),height=new Float32Array(w*h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,dx=x+.5,dy=y+.5;
    const a=kind==='empty'?0:kind==='solid'?1:kind==='drops'?(Math.hypot(dx-44,dy-h/2)<19||Math.hypot(dx-84,dy-h/2)<19?1:0):x>10&&x<w-11&&y>10&&y<h-11?1:0;
    const red=kind==='solid'?.4:kind==='drops'?(x<w/2?.3:.8):3*x/(w-1),green=.2+.6*y/(h-1);data.set([red*a,green*a,.25*a,a],i*4);height[i]=red*a*.2;
   }
   gl.bindTexture(gl.TEXTURE_2D,source.textures[0]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RGBA,gl.FLOAT,data);gl.bindTexture(gl.TEXTURE_2D,source.textures[1]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RED,gl.FLOAT,height);
   const n=node();n.boundary=boundary;enable(n,id,values);const out=applyPostFx(r,source,n),a=read(out),ht=r.target(w,h,false,aspect);r.pass(ht,{source:{...out,textures:[out.textures[1],out.textures[1]]},op:3});const heights=read(ht);r.release(ht);r.release(out);
   if(id!=='dissolve'||values.dissolveStyle===0)if(id!=='liquidFusion'||values.fusionColor!==1)for(let i=0;i<a.length;i+=4)check(Math.abs(a[i]*.2-heights[i])<3e-6,'Color/height desynchronized '+id);
   return {data,a,heights,w,h};
  };
  try{
   check(r.float,'This GPU check needs float targets');const modes=[];
   for(const id of ids){
    const p=make(),n=p.root.children[0],base=draw(p);enable(n,id);const a=draw(p);
    check(diff(base,a)>.0001,'Effect did not change source '+id);check(diff(a,draw(p))<1e-7,'Paused output changed '+id);draw(p,.9);r.clearCache();check(diff(a,draw(p))<1e-7,'Scrubbing/cache changed '+id);
    check(diff(a,draw(sanitizeTree(JSON.parse(JSON.stringify(p)))))<1e-7,'Save/restore changed '+id);
    const copy=project();copy.root.children=[cloneNode(n)];check(diff(a,draw(copy))<1e-7,'Component clone changed '+id);check(diff(a,draw(p,.4,112,true))<2e-5,'Stream export differs '+id);
    n.postEffects[id].mix=0;check(diff(base,draw(p))<1e-7,'Zero mix changed '+id);
    check(raw(id,{},'empty').a.every(v=>v===0),'Empty source gained content '+id);
    const hdr=raw(id,id==='dissolve'?{dissolveStyle:0}:{});check(hdr.a.some((v,i)=>i%4===0&&v>1),'HDR clipped '+id);check(hdr.a[3]===0,'Transparent corner filled '+id);
    const image=make(imageId);image.root.children[0].color={mode:'inherit'};const imageBase=draw(image);enable(image.root.children[0],id);check(diff(imageBase,draw(image))>.0001,'Imported image not processed '+id);
    const portable=await readResourcePack(await encodeResourcePack(image));portable.register();const restored=sanitizeTree(portable.payload);check(diff(draw(image),draw(restored))<1e-7,'Portable image component changed '+id);portable.rollback();
    modes.push(id);
   }
   for(let pattern=0;pattern<3;pattern++){
    let last=Infinity,first;for(const progress of [0,.2,.5,.8,1]){
     const {data,a}=raw('dissolve',{dissolvePattern:pattern,dissolveStyle:0,progress}),mass=a.reduce((s,v,i)=>s+(i%4===3?v:0),0);check(mass<=last,'Nonmonotonic dissolve '+pattern);last=mass;
     if(progress===0)check(a.every((v,i)=>v===data[i]),'Dissolve start not exact');if(progress===1)check(a.every(v=>v===0),'Dissolve end not empty');if(progress===.5)first=a;
    }
    const changed=raw('dissolve',{dissolvePattern:pattern,dissolveStyle:0,progress:.5,seed:55}).a;check(diff(first,changed)>.0001,'Seed ignored '+pattern);
   }
   for(const dissolveStyle of [0,1]){const start=raw('dissolve',{progress:1e-6,edgeSoftness:.15,dissolveStyle}),end=raw('dissolve',{progress:1-1e-6,edgeSoftness:.15,dissolveStyle});check(diff(start.a,start.data)<1e-7,'Soft dissolve pops at start');check(end.a.every(v=>v===0),'Soft dissolve pops at end');}
   const plain=raw('dissolve',{progress:.4,dissolveStyle:0}),burn=raw('dissolve',{progress:.4,dissolveStyle:1});check(diff(plain.a,burn.a)>.0001,'Burn edge absent');for(let i=3;i<burn.a.length;i+=4){check(Math.abs(plain.a[i]-burn.a[i])<1e-7,'Burn changed coverage');check(burn.a[i]<=burn.data[i],'Burn created outside source');}
   for(const aspect of [.5,1,2])for(const progress of [0,1]){const {a,data}=raw('shockwave',{progress},'gradient','clip',aspect);check(a.every((v,i)=>v===data[i]),'Wave endpoints not exact');}
   const wave=raw('shockwave',{progress:.4,waveRadius:.9,waveWidth:48,displacement:64,waveDecay:0});let moved=0;
   for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,rad=Math.hypot((x+.5)/128-.5,(y+.5)/128-.5);if(Math.abs(rad-.36)>48/1024+.01)for(let k=0;k<4;k++)check(Math.abs(wave.a[i+k]-wave.data[i+k])<1e-6,'Wave changed pixels outside band');else moved+=Math.abs(wave.a[i]-wave.data[i]);}check(moved>1,'Wave band inactive');
   const clipped=raw('shockwave',{centerX:.1,centerY:.5,progress:.4,displacement:128},'solid'),wrapped=raw('shockwave',{centerX:.1,centerY:.5,progress:.4,displacement:128},'solid','repeat');check(clipped.a.some((v,i)=>i%4===3&&v<.99),'Wave clamped opaque boundary');for(let i=3;i<wrapped.a.length;i+=4)check(Math.abs(wrapped.a[i]-1)<1e-6,'Wrapped wave lost alpha');
   const liquid=raw('liquidFusion',{fusionRadius:24,fusionThreshold:.28,fusionSoftness:.04},'drops'),center=(64*128+64)*4;check(liquid.data[center+3]===0&&liquid.a[center+3]>.8,'Adjacent drops did not join');
   const zero=raw('liquidFusion',{fusionRadius:0},'drops');check(zero.a.every((v,i)=>v===zero.data[i]),'Zero fusion radius changed source');check(raw('liquidFusion',{fusionThreshold:.05,fusionSoftness:.4},'empty').a.every(v=>v===0),'Soft fusion fabricated opacity');
   const uniform=raw('liquidFusion',{fusionColor:1,liquidColor:'#ff0000'},'drops');for(let i=0;i<uniform.a.length;i+=4){check(Math.abs(uniform.a[i]-uniform.a[i+3])<1e-6&&uniform.a[i+1]===0&&uniform.a[i+2]===0,'Uniform liquid color incorrect');}
   const p=make(),g=node('group');g.children=[p.root.children[0],node('shape','Star')];Object.assign(g.children[0].transform,{x:.4,width:.7,height:.7});Object.assign(g.children[1].transform,{x:.7,width:.45,height:.45});p.root.children=[g];enable(g,'shockwave');const grouped=draw(p);g.postEffects.shockwave.enabled=false;for(const c of g.children)enable(c,'shockwave');check(diff(grouped,draw(p))>.0001,'Group did not composite before distortion');
   g.children.forEach(c=>c.postEffects.shockwave.enabled=false);enable(g,'dissolve');enable(g,'liquidFusion');g.effectOrder=['dissolve','liquidFusion'];const order=draw(p);g.effectOrder=['liquidFusion','dissolve'];check(diff(order,draw(p))>.0001,'Order ignored');
   g.postEffects.liquidFusion.enabled=false;g.tracks['postEffects.dissolve.progress']={keys:[[0,0],[1,1]],ease:'linear'};check(diff(draw(p,.2),draw(p,.8))>.001,'Progress keyframe ignored');
   const samples=[];for(const sample of contentEffectSamples()){
    const p=project();p.root.children=[cloneNode(sample.root)];Object.assign(p.output,sample.output);const a=draw(p,.5,160);check(a.some((v,i)=>i%4===3&&v>.1),'Empty example '+sample.nameKey);if(sample.output.loopExport)check(diff(draw(p,0),draw(p,1))<1e-6,'Loop example mismatch');samples.push(sample.nameKey);
   }
   const drops=contentEffectSamples()[2].root.children;
   const local=(group,aspect=1)=>{const p=project();p.canvas.ratio=aspect;const c=cloneNode(group);Object.assign(c.transform,{x:.5,y:.5,width:1,height:1});p.root.children=[c];return draw(p,.5,128);};
   const components=a=>{const seen=new Uint8Array(128*128);let count=0;for(let i=0;i<seen.length;i++){if(seen[i]||a[i*4+3]<.5)continue;count++;const queue=[i];seen[i]=1;for(let j=0;j<queue.length;j++){const q=queue[j],x=q%128,y=Math.floor(q/128);for(const next of [x>0?q-1:-1,x<127?q+1:-1,y>0?q-128:-1,y<127?q+128:-1])if(next>=0&&!seen[next]&&a[next*4+3]>=.5){seen[next]=1;queue.push(next);}}}return count;};
   const separated=components(local(drops[0])),joined=components(local(drops[1]));check(separated===3&&joined===1,'Liquid example must demonstrate joining '+separated+' -> '+joined);const narrowJoined=components(local(drops[1],.46/.88));check(narrowJoined===1,'Narrow liquid example must join all drops '+narrowJoined);
   const pngProject=make();enable(pngProject.root.children[0],'shockwave');const pixels=draw(pngProject),blob=await encodePNG(pixels,112,112),bitmap=await createImageBitmap(new Blob([blob],{type:'image/png'}),{colorSpaceConversion:'none'}),canvas=document.createElement('canvas');canvas.width=canvas.height=112;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const decoded=ctx.getImageData(0,0,112,112).data;bitmap.close();const pngDifference=diff(Float32Array.from(pixels,v=>Math.max(0,Math.min(1,v))),Float32Array.from(decoded,v=>v/255));check(pngDifference<.003,'PNG export differs '+pngDifference);
   r.clearCache();r.float=false;for(const id of ids){const p=make();enable(p.root.children[0],id);draw(p);draw(p,.4,112,true);}r.clearCache();
   return {modes,patterns:3,groups:true,images:true,height:true,HDR:true,zeroBypass:true,transparency:true,deterministic:true,save:true,component:true,order:true,keyframes:true,stream:true,png:true,fallback8bit:true,samples};
  }finally{r.destroy();}
 },fixture.imageId);
 if(!gpuOnly){
  await page.goto(origin+(built?'/built.html':'/'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#project-file').setInputFiles({name:'Content image group.zip',mimeType:'application/zip',buffer:Buffer.from(fixture.pack,'base64')});await page.locator('.tree-node-name').filter({hasText:'Content scene'}).first().waitFor();
  const selectGroup=()=>page.locator('.tree-node-name').filter({hasText:'Content scene'}).first().click();await selectGroup();await page.locator('#inspector-tabs').getByRole('button',{name:'合成',exact:true}).click();
  const panel=page.locator('#inspector details[data-module="modules.imageFilters"]');if(await panel.getAttribute('open')===null)await panel.locator(':scope>summary .inspector-module-title').click();
  const effect=id=>panel.locator('[data-effect="'+id+'"]'),save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')));
  const signature=arg=>{const c=document.querySelector('#tree-canvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261;for(let i=0;i<a.length;i+=17)hash=Math.imul(hash^a[i],16777619);return arg?(hash!==arg.baseline)===arg.changed:hash;};
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const baseline=await page.evaluate(signature);
  for(const id of ['dissolve','shockwave','liquidFusion']){const input=effect(id).locator('summary input[type=checkbox]');await input.check();await page.waitForFunction(signature,{baseline,changed:true});assert.equal((await save()).root.children[0].postEffects[id].enabled,true);await input.uncheck();await page.waitForFunction(signature,{baseline,changed:false});}
  await effect('dissolve').locator('summary input[type=checkbox]').check();await effect('dissolve').getByRole('combobox',{name:'消散样式',exact:true}).selectOption('0');assert.equal(await effect('dissolve').getByLabel('燃烧颜色',{exact:true}).count(),0);await effect('dissolve').getByRole('combobox',{name:'消散样式',exact:true}).selectOption('1');assert.equal(await effect('dissolve').getByLabel('燃烧颜色',{exact:true}).count(),1);
  await effect('dissolve').getByRole('combobox',{name:'消散分布',exact:true}).selectOption('2');assert.equal(await effect('dissolve').getByRole('spinbutton',{name:'消散方向 °',exact:true}).count(),1);
  await effect('liquidFusion').locator('summary input[type=checkbox]').check();await effect('liquidFusion').getByRole('combobox',{name:'融合颜色来源',exact:true}).selectOption('1');assert.equal(await effect('liquidFusion').getByLabel('液体颜色',{exact:true}).count(),1);
  // Real pointer reorder uses the same animated placeholder as existing effects.
  for(const id of ['dissolve','shockwave','liquidFusion'])await effect(id).locator('details').evaluate(el=>el.open=false);
  const from=effect('liquidFusion').locator('.post-effect-grip'),to=effect('dissolve').locator('.post-effect-grip');await from.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y,{steps:10});assert.equal(await page.locator('.post-effect-placeholder').count(),1);await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('.post-effect-placeholder'));assert.ok((await save()).root.children[0].effectOrder.indexOf('liquidFusion')<(await save()).root.children[0].effectOrder.indexOf('dissolve'));
  await panel.locator(':scope>summary .module-pin').click();const shortcut=page.locator('.node-shortcut[data-shortcut="modules.imageFilters"] [data-effect="liquidFusion"]');if(await shortcut.locator('details').getAttribute('open')===null)await shortcut.locator('summary').click();const radius=shortcut.getByRole('spinbutton',{name:'融合半径',exact:true});await radius.fill('21');await radius.press('Tab');assert.equal((await save()).root.children[0].postEffects.liquidFusion.fusionRadius,21);
  const saved=await save();await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.deepEqual((await save()).root.children[0].postEffects,saved.root.children[0].postEffects);assert.deepEqual((await save()).root.children[0].effectOrder,saved.root.children[0].effectOrder);
  await selectGroup();await page.locator('#inspector-tabs').getByRole('button',{name:'合成',exact:true}).click();await page.locator('#language-settings').selectOption('en');
  for(const id of ['dissolve','shockwave','liquidFusion']){const section=effect(id);if(await section.locator('details').getAttribute('open')===null)await section.locator('.post-effect-title').click();assert.ok(!/[\u3400-\u9fff]/.test(await section.innerText()));assert.ok(!/fx\.(param|option|help|effect)\./.test(await section.innerText()));}
  await page.locator('#duplicate').click();const nodeIds=(await save()).root.children.map(n=>n.id);await page.locator('#node-tree [data-node-id="'+nodeIds[0]+'"] .tree-node-name').first().click();await page.locator('#node-tree [data-node-id="'+nodeIds[1]+'"] .tree-node-name').first().click({modifiers:['Control']});await page.locator('#inspector-tabs').getByRole('button',{name:'Composite',exact:true}).click();
  if(await panel.getAttribute('open')===null)await panel.locator(':scope>summary .inspector-module-title').click();const wave=effect('shockwave');if(await wave.locator('details').getAttribute('open')===null)await wave.locator('.post-effect-title').click();const progress=wave.getByRole('spinbutton',{name:'Batch Effect progress',exact:true});await progress.fill('.55');await progress.press('Tab');assert.ok((await save()).root.children.every(n=>n.postEffects.shockwave.progress===.55));
 }
 assert.deepEqual(errors,[]);await mkdir('test-results/content-effects',{recursive:true});await writeFile('test-results/content-effects/'+(built?'built':gpuOnly?'gpu':'source')+'.json',JSON.stringify({...gpu,built,ui:!gpuOnly},null,2));console.log({...gpu,built,ui:!gpuOnly});
}finally{await browser?.close();server.close();}
