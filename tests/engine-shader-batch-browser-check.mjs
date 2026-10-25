// One browser/context batch produces an immutable consumer suite and one aggregate report.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import modules from '../web/engine-shader-runtime.js';
import {exportGraphicShader} from '../web/graphic-shader.js';
import {exportPostEffectShader} from '../web/post-effect-shader.js';
import {builtinAsset} from '../web/resource-assets.js';
const outputOption=process.argv.indexOf('--output');
const root=resolve('web'),out=resolve(outputOption<0?'test-results/engine-shader-batch':process.argv[outputOption+1]);await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+name);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.glsl':'text/plain','.css':'text/css'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const batch={schema:'momo.engine-shader-batch/v1',target:{engine:'Unity',version:'2022.3',pipeline:'URP',pipelineVersion:'14'},graphics:[],effects:[],failures:[]};
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage();page.setDefaultTimeout(180000);
 await page.goto('http://127.0.0.1:'+server.address().port+'/authoring-render.html');
 await page.evaluate(async()=>{const {TreeRenderer}=await import('./tree-renderer.js'),{project,node}=await import('./tree-model.js'),{builtinAsset}=await import('./resource-assets.js'),{encodePNG}=await import('./encoders.js'),{createPostEffectPreview}=await import('./post-effect-preview.js'),{effectPreviewSpec}=await import('./post-effect-specimens.js'),{EFFECT_BY_ID}=await import('./post-effect-specs.js');window.batchTools={renderer:new TreeRenderer(document.createElement('canvas')),project,node,builtinAsset,encodePNG,preview:createPostEffectPreview(document),effectPreviewSpec,EFFECT_BY_ID};});
 const ids=Object.keys(modules.graphics).filter(id=>!process.argv.includes('--new-only')||modules.graphics[id].verification.browserParity!=='passed');
 for(let start=0;start<ids.length;start+=8){
  const rows=await page.evaluate(async ids=>{const t=window.batchTools,rows=[];for(const id of ids){let gl,program;try{
   const asset=t.builtinAsset(id),module=asset.engineShaders.unity,p=t.project(),n=t.node('shape',id);p.root.children=[n];p.output.alpha=true;
   const width=['LedBar','FlowingWater'].includes(id)?512:128,height=width,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;gl=canvas.getContext('webgl2',{premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
   const compile=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const vs=compile(gl.VERTEX_SHADER,'#version 300 es\nout vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0,1);}'),fs=compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;precision highp int;in vec2 uv;out vec4 frag;uniform float MF_seconds;\n'+module.files['Reference/graphic.glsl']+'\nvoid main(){vec4 c=MF_Evaluate(uv,MF_seconds);frag=vec4(c.a>0.?c.rgb/c.a:vec3(0.),c.a);}');
   program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
   const manifest=JSON.parse(module.files['Unity/parameters.json']);for(const prop of manifest.materialProperties){const loc=gl.getUniformLocation(program,prop.name);if(prop.type==='Vector')gl.uniform4f(loc,prop.vectorValue.x,prop.vectorValue.y,prop.vectorValue.z,prop.vectorValue.w);else gl.uniform1f(loc,prop.floatValue);}
   const states=[{name:'default',seconds:0},{name:'time',seconds:1.37}];for(const spec of asset.definition.parameters){const value=spec.type==='boolean'?+!spec.default:spec.step===1?Math.round(spec.min+(spec.max-spec.min)*.37):spec.min+(spec.max-spec.min)*.37;states.push({name:'param-'+spec.variable,seconds:.73,variable:spec.variable,value});}
   const cases=[];let worst=0;
   for(const state of states){n.params=[...asset.definition.defaults];if(state.variable)n.params[asset.definition.parameters.find(p=>p.variable===state.variable).slot]=state.value;
    for(const parameter of module.parameters)gl.uniform1f(gl.getUniformLocation(program,parameter.property),n.params[parameter.slot]);
    const pixels=t.renderer.draw(p,width,height,{formulaSeconds:state.seconds,time:state.seconds/p.output.seconds,read:true,quality:2});gl.uniform1f(gl.getUniformLocation(program,'MF_seconds'),state.seconds);gl.viewport(0,0,width,height);gl.drawArrays(gl.TRIANGLES,0,3);const generated=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,generated);
    let black=0,white=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=(y*width+x)*4,b=((height-y-1)*width+x)*4,alpha=pixels[a+3],other=generated[b+3]/255;for(let k=0;k<3;k++){const delta=Math.min(1,Math.max(0,pixels[a+k]))*alpha-generated[b+k]/255*other;black+=Math.abs(delta);white+=Math.abs(delta+other-alpha);}}
    const blackMAE=black/(width*height*3)*255,whiteMAE=white/(width*height*3)*255;worst=Math.max(worst,blackMAE,whiteMAE);
    const bytes=await t.encodePNG(pixels,width,height);let binary='';for(let at=0;at<bytes.length;at+=8192)binary+=String.fromCharCode(...bytes.subarray(at,at+8192));cases.push({...state,width,height,params:[...n.params],blackMAE,whiteMAE,png:btoa(binary)});
   }
   rows.push({id,worst,cases,supported:worst<10});
  }catch(e){rows.push({id,supported:false,error:e.message});}finally{if(program)gl?.deleteProgram(program);gl?.getExtension('WEBGL_lose_context')?.loseContext();}}return rows;},ids.slice(start,start+8));
  for(const row of rows){if(!row.supported){batch.failures.push({...row,cases:row.cases?.map(({png,...c})=>c)});continue;}const folder=resolve(out,row.id);await mkdir(folder,{recursive:true});for(const c of row.cases){c.reference=resolve(folder,c.name+'.png');await writeFile(c.reference,Buffer.from(c.png,'base64'));delete c.png;}const pack=await exportGraphicShader({type:row.id,params:builtinAsset(row.id).definition.defaults}),path=resolve(folder,'module.zip');await writeFile(path,pack.bytes);batch.graphics.push({...row,path,sha256:createHash('sha256').update(pack.bytes).digest('hex'),manifest:pack.manifest});}
  console.log('Graphics batch '+Math.min(start+8,ids.length)+'/'+ids.length);
 }
 for(const id of Object.keys(modules.effects)){
  const result=await page.evaluate(async id=>{const t=window.batchTools,spec=t.EFFECT_BY_ID.get(id),v={...Object.fromEntries(spec.parameters.map(p=>[p.key,p.default])),...t.effectPreviewSpec(id).values},cases=[];
   for(const seconds of [0,1.37]){const pair=t.preview.pair(id,seconds),images={};for(const key of ['before','after']){const c=document.createElement('canvas');c.width=pair[key].width;c.height=pair[key].height;c.getContext('2d').putImageData(pair[key],0,0);images[key]=c.toDataURL().split(',')[1];}cases.push({seconds,width:pair.before.width,height:pair.before.height,...images});}return {values:v,cases};},id);
  const folder=resolve(out,'effect-'+id);await mkdir(folder,{recursive:true});for(const c of result.cases)for(const key of ['before','after']){const path=resolve(folder,key+'-'+c.seconds+'.png');await writeFile(path,Buffer.from(c[key],'base64'));delete c[key];c[key+'Path']=path;}
  const pack=await exportPostEffectShader(id,{values:result.values}),path=resolve(folder,'module.zip');await writeFile(path,pack.bytes);batch.effects.push({id,path,sha256:createHash('sha256').update(pack.bytes).digest('hex'),...result,manifest:pack.manifest,inputIsLinear:true,inputIsPremultiplied:false,heightMode:1,output:'premultiplied numeric sRGB, linear ARGBHalf RT; convert to straight sRGB for PNG comparison'});
 }
 await writeFile(resolve(out,'batch.json'),JSON.stringify(batch,null,2)+'\n');
 console.log(JSON.stringify({graphics:batch.graphics.length,effects:batch.effects.length,failures:batch.failures.map(f=>({id:f.id,worst:f.worst,error:f.error})),index:resolve(out,'batch.json')}));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
