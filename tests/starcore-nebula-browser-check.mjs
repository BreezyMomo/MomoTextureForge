import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('web'),out=resolve('test-results/starcore-nebula');
await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const name=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+sep))throw Error('Outside web');
 res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');
 res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url+'/authoring-render.html');
 const report=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node}=await import('./tree-model.js');
  const {encodePNG}=await import('./encoders.js');
  const renderer=new TreeRenderer(document.createElement('canvas')),p=project(),n=node('shape','StarcoreNebula');p.root.children=[n];
  const rows=[],previews=[],render=(seconds=0,w=160,h=128)=>renderer.draw(p,w,h,{formulaSeconds:seconds,read:true,quality:1});
  try{
   for(const seconds of [0,1.37]){
    p.output.alpha=true;const rgba=render(seconds);let minAlpha=1,maxAlpha=0,lowAlpha=0;
    for(let i=0;i<rgba.length;i+=4){
     if(!rgba.subarray(i,i+4).every(Number.isFinite))throw Error('Nonfinite RGBA');
     minAlpha=Math.min(minAlpha,rgba[i+3]);maxAlpha=Math.max(maxAlpha,rgba[i+3]);if(rgba[i+3]<.05)lowAlpha++;
    }
    if(lowAlpha<160*128*.5||maxAlpha<.1)throw Error('Expected transparent space and visible stars');
    for(const background of ['#000000','#ffffff','#804020']){
     p.output.alpha=false;p.output.background=background;const composited=render(seconds),rgb=background.slice(1).match(/../g).map(v=>parseInt(v,16)/255);let error=0;
     for(let i=0;i<rgba.length;i+=4)for(let c=0;c<3;c++)error=Math.max(error,Math.abs(composited[i+c]-(rgba[i+c]*rgba[i+3]+rgb[c]*(1-rgba[i+3]))));
     if(error>.003)throw Error('Canvas background composition differs: '+error);
     if(seconds===0){const bytes=await encodePNG(composited,160,128);let text='';for(const byte of bytes)text+=String.fromCharCode(byte);previews.push({background,url:'data:image/png;base64,'+btoa(text)});}
    }
    rows.push({seconds,minAlpha,maxAlpha,lowAlpha});
   }
   p.output.alpha=true;n.params[5]=0;
   if(!render().every(value=>Math.abs(value)<.00001))throw Error('Zero nebula brightness must produce empty RGBA');
   p.output.alpha=false;p.output.background='#804020';const empty=render();
   for(let i=0;i<empty.length;i+=4)for(const [c,value]of [128/255,64/255,32/255,1].entries())if(Math.abs(empty[i+c]-value)>.003)throw Error('Empty effect obscures canvas background');
   return {rows,previews};
  }finally{renderer.destroy();}
 });
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify(report.rows,null,2));
 for(const preview of report.previews)await writeFile(resolve(out,preview.background.slice(1)+'.png'),Buffer.from(preview.url.split(',')[1],'base64'));
 await page.goto(url+'/');
 await page.locator('#shape-search').fill('深空星云');
 const card=page.locator('.tree-pattern-card').filter({hasText:'深空星云'});
 await card.waitFor();assert.equal(await card.count(),1);
 await card.locator('img').evaluate(async image=>{await image.decode();});
 await card.screenshot({path:resolve(out,'card.png')});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,rows:report.rows,card:resolve(out,'card.png')},null,2));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
