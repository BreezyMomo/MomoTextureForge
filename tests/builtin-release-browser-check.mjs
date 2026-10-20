import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {decodeZIP} from '../web/resource-zip.js';
const root=fileURLToPath(new URL('..',import.meta.url)),out=resolve(root,'test-results/builtin-release');
const fixtureFiles=new Map();
const externalArgument=process.argv.indexOf('--external-library');
if(externalArgument>=0){
 const externalRoot=resolve(process.argv[externalArgument+1]);
 const index=JSON.parse(await readFile(resolve(externalRoot,'index.json'),'utf8'));
 const implementation=JSON.parse(await readFile(resolve(root,'docs/builtin-implementation.json'),'utf8'));
 const removed=new Set(implementation.patterns.filter(p=>p.status==='external').map(p=>p.id));
 for(const entry of index.entries){
  const path=resolve(externalRoot,entry.file);if(!path.startsWith(externalRoot+sep))throw Error('External path escape');
  const bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('External SHA mismatch');
  const files=await decodeZIP(bytes),manifest=JSON.parse(new TextDecoder().decode(files.get('manifest.json'))),payload=JSON.parse(new TextDecoder().decode(files.get(manifest.content)));
  const id=payload.root?.type;
  if(removed.has(id))fixtureFiles.set('/__external/'+id+'.zip',bytes);
 }
 if(fixtureFiles.size!==removed.size)throw Error('External library is missing removed definitions');
}
await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(fixtureFiles.has(pathname)){res.setHeader('Content-Type','application/zip');res.end(fixtureFiles.get(pathname));return;}
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
 const external=[];
 for(const path of fixtureFiles.keys()){
  external.push(await page.evaluate(async ({path,gallery})=>{
   const {readResourcePack}=await import('./resource-pack.js'),{sanitizeTree}=await import('./tree-model.js'),{TreeRenderer}=await import('./tree-renderer.js');
   const {BY_ID}=await import('./catalog.js');const id=path.split('/').at(-1).slice(0,-4);
   if(BY_ID.has(id))throw Error(id+' should not be built in');
   const pack=await readResourcePack(await (await fetch(path)).arrayBuffer());let renderer;
   try{
    pack.register();const p=check.project();p.root.children=[pack.payload.root];
    const clean=sanitizeTree(p);renderer=new TreeRenderer(document.createElement('canvas'));
    const raw=renderer.draw(clean,48,48,{read:true,formulaSeconds:.73,quality:1});
    if(!raw.every(Number.isFinite))throw Error(id+' external render invalid');
    const result={id,name:BY_ID.get(pack.payload.root.type).zh,importedType:pack.payload.root.type,rendered:true};
    if(gallery){
     const raw=renderer.draw(clean,224,224,{read:true,formulaSeconds:.73,quality:2});
     const png=await check.encodePNG(raw,224,224);let encoded='';
     for(let i=0;i<png.length;i+=8192)encoded+=String.fromCharCode(...png.subarray(i,i+8192));
     result.preview='data:image/png;base64,'+btoa(encoded);
    }
    return result;
   }finally{renderer?.destroy();pack.rollback();}
  },{path,gallery:process.argv.includes('--external-gallery')}));
  if(external.length%10===0)console.log('Imported '+external.length+'/'+fixtureFiles.size);
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(resolve(out,'report.json'),JSON.stringify({patterns:count,errors,rows:result.rows,external:external.map(({preview,...row})=>row)},null,2));
 await writeFile(resolve(root,'web/builtin-thumbnails.js'),'// Generated from the current built-in definitions by tests/builtin-release-browser-check.mjs.\nexport default '+JSON.stringify(result.thumbnails)+';\n');
 await page.evaluate(async()=>{document.body.replaceChildren();const c=document.createElement('canvas');c.width=12*112;c.height=Math.ceil(check.rows.length/12)*124;const g=c.getContext('2d');g.fillStyle='#202329';g.fillRect(0,0,c.width,c.height);g.font='10px sans-serif';for(let i=0;i<check.rows.length;i++){const id=check.rows[i].id,img=new Image();img.src=check.thumbnails[id];await img.decode();const x=i%12*112,y=Math.floor(i/12)*124;g.drawImage(img,x,y,96,96);g.fillStyle='white';g.fillText(id,x,y+108,110);}document.body.append(c);});
 await page.locator('canvas').screenshot({path:resolve(out,'gallery.png')});
 if(process.argv.includes('--external-gallery')&&external.length){
  for(const row of external)await writeFile(resolve(out,'external-'+row.id+'.png'),Buffer.from(row.preview.split(',')[1],'base64'));
  await page.evaluate(async rows=>{
   document.body.replaceChildren();const canvas=document.createElement('canvas');
   const columns=5,cellWidth=248,cellHeight=286,margin=16,top=80;
   canvas.width=columns*cellWidth+margin*2;canvas.height=Math.ceil(rows.length/columns)*cellHeight+top+margin;
   const g=canvas.getContext('2d');g.fillStyle='#1d2128';g.fillRect(0,0,canvas.width,canvas.height);
   g.fillStyle='#f3f5f8';g.font='bold 24px Microsoft YaHei, sans-serif';g.fillText('维持外置的 '+rows.length+' 个图形',margin,34);
   g.fillStyle='#aab5c5';g.font='14px Microsoft YaHei, sans-serif';g.fillText('原实现 · 默认参数 · 图形时间 0.73 秒',margin,61);
   for(const [i,row] of rows.entries()){
    const x=margin+(i%columns)*cellWidth,y=top+Math.floor(i/columns)*cellHeight;
    for(let cy=0;cy<224;cy+=8)for(let cx=0;cx<224;cx+=8){g.fillStyle=(cx/8+cy/8)%2?'#303640':'#272d36';g.fillRect(x+cx,y+cy,8,8);}
    const image=new Image();image.src=row.preview;await image.decode();g.drawImage(image,x,y,224,224);
    g.fillStyle='#f3f5f8';g.font='17px Microsoft YaHei, sans-serif';g.fillText(String(i+1).padStart(2,'0')+' '+row.name,x,y+247,236);
    g.fillStyle='#aab5c5';g.font='13px sans-serif';g.fillText(row.id,x,y+268,236);
   }
   document.body.style.margin='0';document.body.append(canvas);
  },external);
  await page.locator('canvas').screenshot({path:resolve(out,'remaining-external-gallery.png')});
 }
 console.log(JSON.stringify({patterns:count,constant:result.rows.filter(r=>r.max-r.min<.00001).map(r=>r.id),noMotion:result.rows.filter(r=>r.usesTime&&r.motion<.000001).map(r=>r.id)},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
