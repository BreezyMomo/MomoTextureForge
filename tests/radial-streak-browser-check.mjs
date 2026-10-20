// Render the actual GLSL on both sides of its angular wrap; run against the local server.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const address=process.argv[2]??'http://127.0.0.1:8799/';
const beforePath=process.argv[3];
const before=beforePath?await readFile(beforePath,'utf8'):null;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(new URL('authoring-render.html',address).href);
 const result=await page.evaluate(async before=>{
  const {BUILTIN}=await import('./definition-runtime.js'),{BY_ID}=await import('./catalog.js'),{pruneGLSL}=await import('./renderer.js');
  const {TreeRenderer}=await import('./tree-renderer.js'),{node,project}=await import('./tree-model.js'),{encodePNG}=await import('./encoders.js');
  const {builtinAsset,registerAsset,unregisterAsset,contentHash}=await import('./resource-assets.js');
  const type=BY_ID.get('RadialStreak'),formula=BUILTIN.sources[type.definition.outputs.scalar.file];
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2;
  const gl=canvas.getContext('webgl2');if(!gl?.getExtension('EXT_color_buffer_float'))throw Error('Floating-point GPU readback unavailable');
  const compile=(kind,text)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
  const vertex=compile(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}');
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA32F,canvas.width,2);
  const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete float target');
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.viewport(0,0,canvas.width,2);
  const probe=(body,parameters,epsilon)=>{
   const fragment=compile(gl.FRAGMENT_SHADER,pruneGLSL(`#version 300 es
precision highp float;precision highp int;
uniform vec4 settings;uniform float epsilon;out vec4 outputValue;
${BUILTIN.libraries['math-v1']}\n${BUILTIN.libraries['reference-v1']}
float valueAt(vec2 q){vec2 u=q*.5+.5;vec4 a=settings,b=vec4(0),c=vec4(0),d=vec4(0);float time=0.;{${body}}}
void main(){float radius=gl_FragCoord.x/2048.*1.2;float side=gl_FragCoord.y<1.?-epsilon:epsilon;outputValue=vec4(valueAt(vec2(-radius,side)));}`));
   const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   gl.useProgram(program);gl.uniform4fv(gl.getUniformLocation(program,'settings'),parameters);gl.uniform1f(gl.getUniformLocation(program,'epsilon'),epsilon);gl.drawArrays(gl.TRIANGLES,0,3);
   const pixels=new Float32Array(canvas.width*2*4);gl.readPixels(0,0,canvas.width,2,gl.RGBA,gl.FLOAT,pixels);
   if(gl.getError()!==gl.NO_ERROR||!pixels.every(Number.isFinite))throw Error('Invalid GPU readback');
   let difference=0,nonzero=0;
   for(let x=128;x<canvas.width;x++){difference+=Math.abs(pixels[x*4]-pixels[(canvas.width+x)*4]);if(pixels[x*4]>.001)nonzero++;}
   gl.deleteProgram(program);gl.deleteShader(fragment);
   return {meanDifference:difference/(canvas.width-128),nonzero};
  };
  const parameters=[type.defaults.slice(0,4),[1,1,.01,1.4],[40,1,.01,1.4],[40,0,.5,.4]];
  const probes=parameters.map(parameters=>({parameters,wide:probe(formula,parameters,.001),near:probe(formula,parameters,.000001),...(before?{before:probe(before,parameters,.000001)}:{})}));
  gl.deleteVertexArray(vao);gl.deleteFramebuffer(framebuffer);gl.deleteTexture(texture);gl.deleteShader(vertex);
  const renderer=new TreeRenderer(document.createElement('canvas'));
  const render=async(type,size)=>{const p=project();p.root.children=[node('shape',type)];return encodePNG(renderer.draw(p,size,size,{read:true,quality:2}),size,size);};
  let oldId;
  try{
   const current=await render(type.id,512),thumbnail=await render(type.id,96);
   const base64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:image/png;base64,'+btoa(text);};
   let old=null;if(before){const asset=builtinAsset(type.id);asset.definition.outputs.scalar.inline=before;oldId='asset_'+await contentHash(asset);registerAsset(oldId,asset);old=base64(await render(oldId,512));}
   return {probes,current:base64(current),thumbnail:base64(thumbnail),before:old};
  }finally{renderer.destroy();if(oldId)unregisterAsset(oldId);}
 },before);
 for(const probe of result.probes){
  assert.ok(probe.near.meanDifference<.002,JSON.stringify(probe));
  assert.ok(probe.near.meanDifference<probe.wide.meanDifference*.05+.000001,JSON.stringify(probe));
 }
 assert.ok(result.probes[0].near.nonzero>0,'probe must render visible rings');
 if(before)assert.ok(result.probes[0].before.meanDifference>result.probes[0].near.meanDifference*10);
 await mkdir('test-results/radial-streak',{recursive:true});
 for(const key of ['current','before'])if(result[key])await writeFile('test-results/radial-streak/'+key+'.png',Buffer.from(result[key].split(',')[1],'base64'));
 // Keep the library thumbnail in step with the corrected formula.
 const {default:thumbnails}=await import('../web/builtin-thumbnails.js');thumbnails.RadialStreak=result.thumbnail;
 const source=await readFile('web/builtin-thumbnails.js','utf8');
 await writeFile('web/builtin-thumbnails.js',source.slice(0,source.indexOf('export default'))+'export default '+JSON.stringify(thumbnails)+';\n');
 await writeFile('test-results/radial-streak/report.json',JSON.stringify(result.probes,null,2));
 console.log(JSON.stringify(result.probes,null,2));
}finally{await browser.close();}
