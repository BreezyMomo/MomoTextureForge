import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=resolve('web'),out=resolve('test-results/effect-samples');await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error('Invalid path');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/authoring-render.html');
 const result=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{effectSamples}=await import('./effect-samples.js'),{project,sanitizeTree,cloneNode,node}=await import('./tree-model.js'),{encodePNG}=await import('./encoders.js');
  const r=new TreeRenderer(document.createElement('canvas')),report=[],size=128;
  const sheet=document.createElement('canvas');sheet.width=4*200;sheet.height=3*224;const ctx=sheet.getContext('2d');ctx.fillStyle='#121c28';ctx.fillRect(0,0,sheet.width,sheet.height);
  const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
  const difference=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
  const samples=effectSamples();
  try{for(const [index,sample]of samples.entries()){
   const p=project();p.root.children=[sample.root];Object.assign(p.output,sample.output);
   const draw=(t,source=p)=>{const pixels=r.draw(source,size,size,{read:true,time:t,quality:2});if(!pixels.every(Number.isFinite)||r.gl.getError())throw Error(sample.name+' GPU error');return pixels;};
   const start=draw(0),middle=draw(.3),later=draw(.65),end=draw(1),roundtrip=draw(.3,sanitizeTree(JSON.parse(JSON.stringify(p))));
   let alpha=0,clear=0,maxAlpha=0;for(let i=3;i<middle.length;i+=4){alpha+=middle[i];if(middle[i]<.001)clear++;maxAlpha=Math.max(maxAlpha,middle[i]);}
   const totalAlpha=pix=>pix.filter((_,i)=>i%4===3).reduce((sum,v)=>sum+v,0)/(size*size);
   const row={name:sample.name,loop:sample.output.loopExport,start:totalAlpha(start),middle:alpha/(size*size),end:totalAlpha(end),clear:clear/(size*size),maxAlpha,animation:difference(middle,later),seam:difference(start,end),roundtrip:difference(middle,roundtrip)};
   if(sample.category==='arrangement'){
    // Changing the shared unit must affect the result while keeping placement and count.
    const replacement=structuredClone(p),g=replacement.root.children[0];g.instanceContent='all';g.children=[node('shape','HeartLeafTeardrop')];
    const changed=draw(.3,replacement);row.replaced=difference(middle,changed);
    row.originalLayout=JSON.stringify(p.root.children[0].arrange)===JSON.stringify(g.arrange);
   }
   // A cloned preset remains an ordinary subtree inside another composition.
   const nested=project(),container=node('group');container.children=[cloneNode(sample.root)];nested.root.children=[container];Object.assign(nested.output,sample.output);
   row.nested=difference(middle,draw(.3,nested));report.push(row);
   const bytes=await encodePNG(middle,size,size),img=new Image();img.src='data:image/png;base64,'+base64(bytes);await img.decode();
   const x=index%4*200,y=Math.floor(index/4)*224;ctx.drawImage(img,x+4,y+4,192,192);ctx.fillStyle='#e6eff9';ctx.font='14px sans-serif';ctx.fillText(sample.name,x+8,y+215,185);
  }
  // Every ring waveform must remain finite at each parameter extreme and join at the angle seam.
  const ringProject=project(),ring=node('shape','RadialStreak');ringProject.root.children=[ring];
  const {BY_ID}=await import('./catalog.js');let extremes=0;
  for(let mode=0;mode<3;mode++)for(const spec of BY_ID.get('RadialStreak').parameters)for(const value of [spec.min,spec.max]){
   ring.params=[...BY_ID.get('RadialStreak').defaults];ring.params[4]=mode;ring.params[spec.slot]=value;
   const pix=r.draw(ringProject,48,48,{time:.37,read:true});if(!pix.every(Number.isFinite)||r.gl.getError())throw Error('Ring extreme '+mode+' '+spec.variable+' '+value);extremes++;
  }
  let curtainExtremes=0;
  const curtain=node('shape','AuroraVeil');ringProject.root.children=[curtain];
  for(let mode=0;mode<2;mode++)for(const spec of BY_ID.get('AuroraVeil').parameters)for(const value of [spec.min,spec.max]){
   curtain.params=[...BY_ID.get('AuroraVeil').defaults];curtain.params[4]=mode;curtain.params[spec.slot]=value;
   const pix=r.draw(ringProject,48,48,{time:.37,read:true});if(!pix.every(Number.isFinite)||r.gl.getError())throw Error('Curtain extreme '+mode+' '+spec.variable+' '+value);curtainExtremes++;
  }
  return {report,extremes,curtainExtremes,preview:sheet.toDataURL('image/png')};
  }finally{r.destroy();}
 });
 await writeFile(out+'/report.json',JSON.stringify({report:result.report,extremes:result.extremes,curtainExtremes:result.curtainExtremes},null,2));
 await writeFile(out+'/artwork.png',Buffer.from(result.preview.split(',')[1],'base64'));
 for(const row of result.report){
  assert.ok(row.middle>.001,row.name+' visible');assert.ok(row.clear>.02,row.name+' transparent');assert.ok(row.roundtrip<1e-6,row.name+' project roundtrip');assert.ok(row.nested<1e-6,row.name+' component nesting');
  if(['雷电打击','冰霜新星','火焰爆炸','全息护盾受击'].includes(row.name)){assert.ok(row.start<.00001,row.name+' appears from transparent');assert.ok(row.end<.00001,row.name+' fades completely');assert.ok(row.animation>.001,row.name+' evolves');}
  else if(row.replaced!==undefined){assert.ok(row.replaced>.005,'Replaceable unit changes the pattern');assert.equal(row.originalLayout,true);}
  else{assert.ok(row.animation>.0001,row.name+' evolves');assert.ok(row.seam<.00001,row.name+' closes its loop');}
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({samples:result.report,ringExtremes:result.extremes,curtainExtremes:result.curtainExtremes,errors},null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
