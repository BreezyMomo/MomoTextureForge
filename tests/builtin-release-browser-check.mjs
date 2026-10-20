import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('..',import.meta.url)),out=resolve(root,'test-results/builtin-release');
await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=resolve(root,'web','.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(resolve(root,'web')+sep))throw Error('outside web');
 res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');
 res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/authoring-render.html');
 const count=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node}=await import('./tree-model.js'),{CATALOG}=await import('./catalog.js');
  const {encodePNG}=await import('./encoders.js');
  window.check={renderer:new TreeRenderer(document.createElement('canvas')),project,node,CATALOG,encodePNG,rows:[],thumbnails:{}};
  return CATALOG.length;
 });
 for(let offset=0;offset<count;offset+=10){
  await page.evaluate(async({offset,parameters})=>{
   const c=window.check;
   for(const type of c.CATALOG.slice(offset,offset+10)){
    const p=c.project(),n=c.node('shape',type.id);p.root.children=[n];
    const render=(seconds=0,seamless=false)=>{p.output.seamless=seamless;return c.renderer.draw(p,96,96,{time:0,formulaSeconds:seconds,read:true,quality:1});};
    const original=render();let min=1,max=0;
    for(let i=0;i<original.length;i+=4){if(!Number.isFinite(original[i]))throw Error(type.id+' nonfinite');min=Math.min(min,original[i]);max=Math.max(max,original[i]);}
    const row={id:type.id,min,max,usesTime:type.usesTime};
    if(type.usesTime){const next=render(1.37);row.motion=next.reduce((sum,x,i)=>sum+Math.abs(x-original[i]),0)/next.length;}
    if(parameters){let checked=0;for(const spec of type.parameters){for(const value of [spec.min,spec.max]){n.params[spec.slot]=value;const pix=render(.73);if(!pix.every(Number.isFinite))throw Error(type.id+' invalid '+spec.key+'='+value);checked++;}n.params[spec.slot]=spec.default;}row.parameterExtremes=checked;}
    const seam=render(.73,true);if(!seam.every(Number.isFinite))throw Error(type.id+' nonfinite seamless');
    c.rows.push(row);
    const bytes=await c.encodePNG(original,96,96);let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));c.thumbnails[type.id]='data:image/png;base64,'+btoa(text);
   }
  },{offset,parameters:process.argv.includes('--parameters')});
  console.log('Rendered '+Math.min(offset+10,count)+'/'+count);
 }
 const result=await page.evaluate(()=>({rows:check.rows,thumbnails:check.thumbnails}));
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(resolve(out,'report.json'),JSON.stringify({patterns:count,errors,rows:result.rows},null,2));
 await writeFile(resolve(root,'web/builtin-thumbnails.js'),'// Generated from the current built-in definitions by tests/builtin-release-browser-check.mjs.\nexport default '+JSON.stringify(result.thumbnails)+';\n');
 await page.evaluate(async()=>{document.body.replaceChildren();const c=document.createElement('canvas');c.width=12*112;c.height=Math.ceil(check.rows.length/12)*124;const g=c.getContext('2d');g.fillStyle='#202329';g.fillRect(0,0,c.width,c.height);g.font='10px sans-serif';for(let i=0;i<check.rows.length;i++){const id=check.rows[i].id,img=new Image();img.src=check.thumbnails[id];await img.decode();const x=i%12*112,y=Math.floor(i/12)*124;g.drawImage(img,x,y,96,96);g.fillStyle='white';g.fillText(id,x,y+108,110);}document.body.append(c);});
 await page.locator('canvas').screenshot({path:resolve(out,'gallery.png')});
 console.log(JSON.stringify({patterns:count,constant:result.rows.filter(r=>r.max-r.min<.00001).map(r=>r.id),noMotion:result.rows.filter(r=>r.usesTime&&r.motion<.000001).map(r=>r.id)},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
