import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {decodeZIP} from '../web/resource-zip.js';
const root=resolve('web'),outputFlag=process.argv.indexOf('--output'),out=resolve(outputFlag<0?'test-results/handdrawn-stroke':process.argv[outputFlag+1]);await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glsl':'text/plain'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/authoring-render.html');
 const results=await page.evaluate(async()=>{
  const {project,node}=await import('./tree-model.js'),{exportSketchShaderReference}=await import('./shader-effect-export.js'),{encodeResourcePack}=await import('./resource-pack.js'),{decodeZIP}=await import('./resource-zip.js'),{ShaderReferenceRenderer}=await import('./shader-reference-renderer.js'),{TreeRenderer}=await import('./tree-renderer.js');
  const check=(v,message)=>{if(!v)throw Error(message);},canvas=async bytes=>{const b=await createImageBitmap(new Blob([bytes],{type:'image/png'})),c=document.createElement('canvas');c.width=b.width;c.height=b.height;c.getContext('2d').drawImage(b,0,0);b.close();return c;},pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data,readGL=r=>{const bytes=new Uint8Array(r.canvas.width*r.canvas.height*4);r.gl.readPixels(0,0,r.canvas.width,r.canvas.height,r.gl.RGBA,r.gl.UNSIGNED_BYTE,bytes);return bytes;};
  const results=[];
  for(const name of ['ring-stroke','heart-fill','no-stroke','zero-opacity','low-opacity','overlap-opacity']){
   const p=project();p.name=name;p.canvas.ratio=name==='ring-stroke'?1.5:1;const n=node('shape',name==='heart-fill'?'HeartLeafTeardrop':'Ring');n.id='stroke-subject';p.root.children=[n];
   Object.assign(n.postEffects.sketch,{enabled:true,fillStyle:name==='heart-fill'?3:4,strokeWidth:name==='no-stroke'?0:12,strokeOpacity:name==='zero-opacity'?0:.45,strokeColor:'#cf4f35',strokeRoughness:2.3,roughness:2.4,doubleStroke:true,bowing:1.5,seed:42,strokeDashPattern:'15 5',strokeDashOffset:3,fillColor:'#3498db',hatchGap:18,hatchWidth:2});
   if(name==='ring-stroke'){Object.assign(n.transform,{x:.55,y:.48,width:.85,height:.72,rotation:31,pivotX:.3,pivotY:.6,mirrorX:true});n.opacity=.68;}
   if(name==='low-opacity'){n.opacity=.2;Object.assign(n.postEffects.sketch,{fillStyle:1,fillOpacity:.8,strokeWidth:0});}
   if(name==='overlap-opacity'){n.opacity=.2;Object.assign(n.postEffects.sketch,{fillStyle:1,fillOpacity:1,strokeOpacity:1,strokeDashPattern:''});}
   if(name==='heart-fill'){const native=new TreeRenderer(document.createElement('canvas'));try{const initial=native.draw(p,128,128,{read:true});native.draw(p,128,128,{read:true,sketchStrokeOnly:n.id});const restored=native.draw(p,128,128,{read:true});check(initial.every((v,i)=>v===restored[i]),'Stroke extraction contaminated normal editor caches');}finally{native.destroy();}}
   const before=JSON.stringify(p),pack=await exportSketchShaderReference({project:p,nodeId:n.id,time:.5,formulaSeconds:1.5});check(before===JSON.stringify(p),'Export changed the project');const files=await decodeZIP(pack.bytes),text=new TextDecoder(),manifest=JSON.parse(text.decode(files.get('parameters.json')));
   check(manifest.stroke.input.file==='stroke-mask.png'&&manifest.stroke.opacity===1,'Missing stroke contract');check(manifest.previewTimeSeconds===1.5,'Reference time lost');
   const stroke=await canvas(files.get('stroke-mask.png')),mask=await canvas(files.get('mask.png')),ref=await canvas(files.get('reference-preview.png')),editor=await canvas(files.get('editor-preview.png')),s=pixels(stroke),m=pixels(mask),a=pixels(ref),b=pixels(editor);let visible=0,outside=0,alphaError=0,blackError=0,whiteError=0,maxAlpha=0;
   for(let i=0;i<s.length;i+=4){check(s[i+3]===255,'Coverage texture must have opaque alpha');if(s[i]>2){visible++;if(m[i]<25)outside++;}alphaError+=Math.abs(a[i+3]-b[i+3]);maxAlpha=Math.max(maxAlpha,Math.abs(a[i+3]-b[i+3]));for(let c=0;c<3;c++){blackError+=Math.abs(a[i+c]*a[i+3]/255-b[i+c]*b[i+3]/255);whiteError+=Math.abs(a[i+c]*a[i+3]/255+255-a[i+3]-b[i+c]*b[i+3]/255-255+b[i+3]);}}
   const count=s.length/4;alphaError/=count;blackError/=count*3;whiteError/=count*3;
   if(name==='no-stroke'||name==='zero-opacity'||name==='low-opacity')check(visible===0,'Disabled stroke leaked pixels');else check(visible>100&&outside>30,'Stroke clipped to fill or empty');
   if(name==='low-opacity'){let inside=0;for(let i=0;i<m.length;i+=4)if(m[i]>254){inside++;check(Math.abs(a[i+3]/255-.16)<.01,'Node opacity not applied once to fill');}check(inside>100,'Low opacity erased fill contour');check(manifest.stroke.nodeOpacity===.2&&manifest.stroke.opacityAfterComposite,'Missing shared node opacity');}
   for(let i=3;i<a.length;i+=4)check(a[i]<=Math.round(n.opacity*255)+1,'Fill/stroke overlap exceeded node opacity');
   if(!['heart-fill','low-opacity','overlap-opacity'].includes(name))check(alphaError<.1&&blackError<.15&&whiteError<.15,'Native stroke changed '+JSON.stringify({name,alphaError,blackError,whiteError,maxAlpha}));
   const r=new ShaderReferenceRenderer(document.createElement('canvas'));try{
    r.setMask(mask);r.setStroke(stroke,{color:manifest.stroke.color});const parameters={...manifest.parameters,inkOpacity:0,paperOpacity:0,scrollX:24};r.draw(parameters,0);const still=readGL(r);r.draw(parameters,4);const moved=readGL(r);check(still.every((v,i)=>v===moved[i]),'Fill scrolling moved the baked stroke');
    r.setStroke(stroke,{color:'#2a8aaf'});r.draw(parameters,0);const colored=readGL(r);check(still.every((v,i)=>i%4!==3||v===colored[i]),'Changing stroke color changed coverage');if(visible)check(still.some((v,i)=>i%4!==3&&v!==colored[i]),'Stroke recoloring has no effect');
    r.setStroke(stroke,{opacity:0});r.draw(parameters,0);check(readGL(r).every((v,i)=>i%4!==3||v===0),'Opacity multiplier zero must remove the stroke');
    if(name==='heart-fill'){r.setStroke(stroke,{color:manifest.stroke.color});r.draw({...manifest.parameters,scrollX:24},0);const first=readGL(r);r.draw({...manifest.parameters,scrollX:24},.75);const later=readGL(r);check(first.some((v,i)=>v!==later[i]),'Procedural fill stopped animating');}
   }finally{r.dispose();}
   results.push({name,manifest,alphaError,blackError,whiteError,maxAlpha,visible,outside,package:[...pack.bytes],project:[...await encodeResourcePack(p)]});
  }
  return results;
 });
 for(const result of results){const folder=resolve(out,result.name);await mkdir(folder,{recursive:true});const bytes=Uint8Array.from(result.package);await writeFile(resolve(folder,'shader-reference.zip'),bytes);await writeFile(resolve(folder,'source.project.zip'),Uint8Array.from(result.project));for(const [name,data]of await decodeZIP(bytes)){const file=resolve(folder,name);await mkdir(dirname(file),{recursive:true});await writeFile(file,data);}delete result.package;delete result.project;delete result.manifest;}
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({pass:true,results,errors},null,2));console.log(JSON.stringify({pass:true,results,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
