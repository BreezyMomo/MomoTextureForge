import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {project,node} from '../web/tree-model.js';
import {BY_ID} from '../web/catalog.js';
import {GRAPHIC_LIST_DEFAULTS_KEY} from '../web/graphic-list-defaults.js';
const built=process.argv.includes('--built'),root=fileURLToPath(new URL(built?'../site/':'../web/',import.meta.url)),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glsl':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root))throw Error();res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const family=['RefractionMembrane','ParticleStrands'],report={built,gpu:null,ui:[]};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);await page.addInitScript(key=>localStorage.setItem(key,'1'),GRAPHIC_LIST_DEFAULTS_KEY);
 const fixture=type=>{const p=project();p.root.children=[node('shape',type)];p.canvas.ratio=4;p.output.width=512;p.output.height=128;return p;};
 const address='http://127.0.0.1:'+server.address().port+'/';
 await page.goto(address+'#tree='+Buffer.from(JSON.stringify(fixture(family[0]))).toString('base64'));await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 if(!built){
  const result=await page.evaluate(async()=>{
   const {TreeRenderer}=await import('./tree-renderer.js'),{GeneratorRenderer}=await import('./generator-renderer.js'),{project,node}=await import('./tree-model.js'),{BY_ID}=await import('./catalog.js'),{encodePNG}=await import('./encoders.js');
   const r=new TreeRenderer(document.createElement('canvas')),p=project();p.canvas.ratio=4;const results={},images={};
   const delta=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length,mean=a=>{let sum=0;for(let i=3;i<a.length;i+=4)sum+=a[i];return sum/(a.length/4);};
   try{
    const originals=[];
    for(const type of ['RefractionMembrane','ParticleStrands']){
     const n=node('shape',type),def=BY_ID.get(type).definition,slot=name=>def.parameters.find(p=>p.variable===name).slot,set=(name,value)=>n.params[slot(name)]=value;
     p.root.children=[n];p.output.alpha=true;const draw=(time=0,w=512,h=128,stream=false)=>r.draw(p,w,h,{read:true,quality:1,formulaSeconds:time,stream});
     const base=draw(),row={mean:mean(base),max:base.reduce((m,v,i)=>i%4===3?Math.max(m,v):m,0),finite:base.every(Number.isFinite),motion:delta(base,draw(.87)),stream:delta(base,draw(0,512,128,true))};originals.push(base);
     set('motionSpeed',0);const still=draw();row.frozen=delta(still,draw(2));set('seed',n.params[slot('seed')]+1);row.seed=delta(still,draw());set('seed',def.defaults[slot('seed')]);
     set('seamlessU',1);const seamless=draw();let edge=0;for(let y=0;y<128;y++)edge+=Math.abs(seamless[y*512*4+3]-seamless[(y*512+511)*4+3]);row.seam=edge/128;set('endFade',.45);row.seamIgnoresFade=delta(seamless,draw());set('seamlessU',0);set('endFade',.08);
     row.smallMean=mean(draw(0,256,64));row.largeMean=mean(draw(0,1024,256));
     if(type==='RefractionMembrane'){
      set('edgeTint',0xff0000);row.edgeColor=delta(still,draw());set('edgeTint',def.defaults[slot('edgeTint')]);set('interiorOpacity',0);set('edgeBrightness',0);set('creaseBrightness',0);row.empty=mean(draw());n.params=[...def.defaults];set('motionSpeed',0);
     }else{set('strandVariation',0);row.variation=delta(still,draw());set('strandVariation',def.defaults[slot('strandVariation')]);set('strandCount',8);row.count=delta(still,draw());n.params=[...def.defaults];set('motionSpeed',0);}
     const fallback=new TreeRenderer(document.createElement('canvas'));try{fallback.base.generators=new GeneratorRenderer(fallback.gl,{float:false});const pixels=fallback.draw(p,256,64,{read:true,quality:1});row.fallback=pixels.every(Number.isFinite)&&mean(pixels)>.001;}finally{fallback.destroy();}
     p.output.alpha=false;images[type]=Array.from(await encodePNG(draw(0,1024,256),1024,256));results[type]=row;
    }
    results.difference=delta(originals[0],originals[1]);return {results,images};
   }finally{r.destroy();}
  });
  await mkdir('test-results/ribbon-family',{recursive:true});for(const [type,bytes]of Object.entries(result.images))await writeFile('test-results/ribbon-family/'+type+'.png',new Uint8Array(bytes));report.gpu=result.results;console.log('GPU '+JSON.stringify(report.gpu));
  for(const type of family){const row=report.gpu[type];assert.ok(row.finite&&row.mean>.003&&row.mean<.7&&row.max>.1,type);assert.ok(row.motion>.0005&&row.seed>.0005,type);assert.equal(row.frozen,0);assert.ok(row.stream<.001&&row.seam<.08,type);assert.equal(row.seamIgnoresFade,0);assert.ok(Math.abs(row.smallMean-row.largeMean)<.07,type);assert.equal(row.fallback,true);}
  assert.equal(report.gpu.RefractionMembrane.empty,0);assert.ok(report.gpu.RefractionMembrane.edgeColor>.001);assert.ok(report.gpu.ParticleStrands.variation>.001&&report.gpu.ParticleStrands.count>.001);assert.ok(report.gpu.difference>.03);
 }
 for(const type of family){
  console.log('UI '+type);await page.goto(address+'#tree='+Buffer.from(JSON.stringify(fixture(type))).toString('base64'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#language-settings').selectOption('zh-CN');await page.locator('#node-tree .tree-node-name').click();
  const def=BY_ID.get(type).definition,saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1'))),preset=page.getByRole('combobox',{name:'拖尾风格预设',exact:true}),slot=name=>def.parameters.find(p=>p.variable===name).slot;
  assert.equal(await preset.locator('option').count(),4);await preset.selectOption(type==='RefractionMembrane'?'iridescent':'flow');let current=(await saved()).root.children[0];assert.equal(current.color.mode,type==='RefractionMembrane'?'inherit':'own');assert.equal(current.params[slot(type==='RefractionMembrane'?'edgeTint':'strandCount')],type==='RefractionMembrane'?0xffcb72:220);await page.locator('#undo').click();assert.deepEqual((await saved()).root.children[0].params,def.defaults);assert.equal((await saved()).root.children[0].color.mode,'inherit');
  const speed=page.locator('#inspector').getByRole('spinbutton',{name:'形态演变速度',exact:true});await speed.fill('0');await speed.press('Tab');await page.locator('#inspector [data-key-path="params.'+slot('motionSpeed')+'"]').click();assert.equal(await speed.isDisabled(),true);await page.locator('#undo').click();
  await page.locator('#inspector [data-module="modules.shapeParameters"]>summary .module-pin').click();assert.equal(await page.locator('.node-shortcut[data-shortcut="modules.shapeParameters"]').getByRole('combobox',{name:'拖尾风格预设',exact:true}).count(),1);
  const original=await saved();await page.locator('#language-settings').selectOption('en');assert.ok(!/[\u3400-\u9fff]/.test(await page.locator('#inspector').innerText()));assert.deepEqual(await saved(),original);
  const download=page.waitForEvent('download');await page.locator('#export-now').click();await page.locator('#confirm-export').click();const exported=await download;assert.equal(await exported.failure(),null);const bytes=await readFile(await exported.path());
  const png=await page.evaluate(async bytes=>{const bmp=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'})),c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;const ctx=c.getContext('2d');ctx.drawImage(bmp,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let sum=0,min=255,max=0;for(let i=3;i<pixels.length;i+=4){sum+=pixels[i];min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i]);}const result={width:c.width,height:c.height,mean:sum/(c.width*c.height*255),min,max};bmp.close();return result;},Array.from(bytes));assert.equal(png.width,512);assert.equal(png.height,128);assert.ok(png.mean>.003&&png.mean<.7&&png.min===0&&png.max>25);await page.locator('#close-global').click();
  await page.evaluate(()=>history.replaceState(null,'',location.pathname));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal((await saved()).root.children[0].type,type);
  await page.locator('#open-graphics-library').click();await page.getByPlaceholder('Search names, categories or tags',{exact:true}).fill(def.aliases.en);const card=page.locator('.graphics-card').filter({hasText:def.aliases.en});await card.waitFor();await card.locator('img').waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.graphics-card img')].some(img=>img.complete&&img.naturalWidth===96));assert.equal(await card.count(),1);await page.locator('.graphics-library-dialog header .graphics-close').click();report.ui.push({type,png,presets:true,keyframes:true,shortcuts:true,undo:true,english:true,reload:true,libraryCard:true});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...report,pass:true}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
