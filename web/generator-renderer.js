import {messageError} from './message-catalog.js';
import {generatorGeometry} from './generator-geometry.js';
import {ribbonWork,ribbonVertex,ribbonFragment,membraneVertex,membraneFragment} from './ribbon-renderer.js';

const vertex=`#version 300 es
out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;
const geometryVertex=`#version 300 es
precision highp float;precision highp int;layout(location=0) in vec4 start;layout(location=1) in vec4 end;layout(location=2) in vec4 tint;
uniform vec2 resolution;uniform int cloud,motionKind;uniform float geometryTime;out vec2 local;out vec4 shade;
vec2 movingPoint(vec2 p){
 if(geometryTime==0.)return p;
 if(motionKind==1)p.x+=(sin(p.y*14.+geometryTime*3.)-sin(p.y*14.))*.018*clamp(p.y+.12,0.,1.);
 if(motionKind==2){float envelope=sin(clamp((p.y-.1)/.82,0.,1.)*3.141593);p.x+=(sin(p.y*27.+geometryTime*13.)-sin(p.y*27.))*.028*envelope;p.y+=(sin(p.x*37.+geometryTime*19.)-sin(p.x*37.))*.004*envelope;}
 return p;
}
void main(){vec2 corners[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(1,1),vec2(-1,-1),vec2(1,1),vec2(-1,1));vec2 corner=corners[gl_VertexID];float t=corner.x*.5+.5;float aspect=resolution.x/resolution.y;vec2 p;
 if(cloud==1||tint.w<0.){p=start.xy+corner*start.z;local=corner;shade=vec4(tint.rgb*start.w,cloud==1?tint.w:-1.);}
 else{vec2 delta=(end.xy-start.xy)*vec2(aspect,1),tangent=length(delta)>.000001?normalize(delta):vec2(1,0);vec2 perpendicular=vec2(-tangent.y,tangent.x)/vec2(aspect,1);float width=mix(start.z,end.z,t);p=mix(start.xy,end.xy,t)+perpendicular*corner.y*width*3.;local=vec2(0,corner.y*3.);shade=vec4(tint.rgb*mix(start.w,end.w,t),tint.w);}
 p=movingPoint(p);if(motionKind>0&&geometryTime!=0.){float ramp=1.-exp(-abs(geometryTime)*6.);float pulse=motionKind==1?.2+1.3*pow(.5+.5*sin(geometryTime*9.-start.y*32.),5.):.55+.45*cos(geometryTime*23.+start.y*2.);shade.rgb*=mix(1.,pulse,ramp);}gl_Position=vec4(p*2.-1.,0,1);}`;
const geometryFragment=`#version 300 es
precision highp float;precision highp int;in vec2 local;in vec4 shade;uniform int cloud;out vec4 result;
void main(){float distance=dot(local,local);float falloff=cloud==1?exp(-distance*mix(8.,2.,shade.a)):shade.a<0.?exp(-distance*4.):exp(-local.y*local.y*5.)+exp(-local.y*local.y)*.12;result=vec4(shade.rgb*falloff,falloff);}`;
const blur=`vec4 generate(vec2 uv){vec4 color=vec4(0);float weights=0.;for(int i=-8;i<=8;i++){float distance=float(i)/8.;float weight=exp(-distance*distance*3.);vec2 p=uv+blurDirection*distance*blurRadius;if(wrapHorizontal==1)p.x=fract(p.x);color+=texture(input0,p)*weight;weights+=weight;}return color/weights;}`;

export class GeneratorRenderer{
 constructor(gl,{float,prune=s=>s}={}){this.gl=gl;this.float=float;this.blendFloat=float&&!!gl.getExtension('EXT_float_blend');this.prune=prune;this.programs=new Map();this.cache=new Map();this.pinned=new Set();this.vao=gl.createVertexArray();this.instances=gl.createBuffer();this.drawCount=0;}
 begin(){this.pinned.clear();}
 program(source,vs=vertex){
  const key=vs+source;if(this.programs.has(key))return this.programs.get(key);
  const gl=this.gl,compile=(code,kind)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('生成器着色器编译失败：'+error);}return shader;};
  const v=compile(vs,gl.VERTEX_SHADER);let f;try{f=compile(this.prune(source),gl.FRAGMENT_SHADER);}catch(error){gl.deleteShader(v);throw error;}const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error(message);}
  const sizes=new Map();for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const uniform=gl.getActiveUniform(p,i);sizes.set(uniform.name,uniform.size);}
  const entry={p,locations:new Map(),sizes};this.programs.set(key,entry);
  if(this.programs.size>24){const first=this.programs.keys().next().value;gl.deleteProgram(this.programs.get(first).p);this.programs.delete(first);}return entry;
 }
 location(program,name){if(!program.locations.has(name))program.locations.set(name,this.gl.getUniformLocation(program.p,name));return program.locations.get(name);}
 target(w,h,{scalar=false,blend=false}={}){
  const gl=this.gl,useFloat=this.float&&(!blend||this.blendFloat),single=scalar&&useFloat;
  const tex=gl.createTexture(),fb=gl.createFramebuffer();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,useFloat?(single?gl.R16F:gl.RGBA16F):gl.RGBA8,w,h,0,single?gl.RED:gl.RGBA,useFloat?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE||gl.getError()){gl.deleteTexture(tex);gl.deleteFramebuffer(fb);throw Error('生成器中间纹理分配失败，请降低分辨率');}
  return {tex,fb,w,h,bytes:w*h*(useFloat?(single?2:8):4)};
 }
 release(target){if(!target)return;this.gl.deleteTexture(target.tex);this.gl.deleteFramebuffer(target.fb);}
 bind(target){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,target.fb);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);gl.viewport(0,0,target.w,target.h);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
 fullscreen(target,body,common,parameters,inputs=[],extra={}){
  const gl=this.gl,defines=parameters.specs.map(p=>'#define '+p.variable+' gp['+p.slot+']').join('\n');
  const source=`#version 300 es\nprecision highp float;precision highp int;in vec2 uv;out vec4 outputValue;uniform float gp[64];uniform float generatorSeed,time;uniform vec2 generatorResolution;uniform sampler2D input0,input1,input2;uniform vec2 blurDirection,bloomStrengths;uniform float blurRadius,emissionIntensity;${body===blur?'uniform int wrapHorizontal;':''}\n${common}\n${defines}\n${body}\nvoid main(){outputValue=generate(uv);}`;
  const program=this.program(source);this.bind(target);gl.useProgram(program.p);gl.bindVertexArray(this.vao);
  const data=new Float32Array(64);data.set(parameters.values);const activeCount=program.sizes.get('gp[0]');if(activeCount)gl.uniform1fv(this.location(program,'gp[0]'),data.subarray(0,activeCount));
  gl.uniform1f(this.location(program,'generatorSeed'),parameters.values[parameters.specs.find(p=>p.variable==='seed')?.slot??0]);
  gl.uniform2f(this.location(program,'generatorResolution'),target.w,target.h);gl.uniform1f(this.location(program,'time'),parameters.time??0);
  if(body===blur)gl.uniform1i(this.location(program,'wrapHorizontal'),extra.wrap?1:0);
  // Do not leave a render target bound to an unused input sampler.
  for(let index=0;index<3;index++){gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,inputs[index]?.tex??null);gl.uniform1i(this.location(program,'input'+index),index);}
  if(extra.direction)gl.uniform2fv(this.location(program,'blurDirection'),extra.direction);if(extra.radius!==undefined)gl.uniform1f(this.location(program,'blurRadius'),extra.radius);
  if(extra.bloom)gl.uniform2fv(this.location(program,'bloomStrengths'),extra.bloom);if(extra.intensity!==undefined)gl.uniform1f(this.location(program,'emissionIntensity'),extra.intensity);
  gl.drawArrays(gl.TRIANGLES,0,3);this.drawCount++;gl.bindVertexArray(null);const error=gl.getError();if(error)throw Error('生成器全屏渲染错误 '+error);
 }
 geometry(target,effect,settings,time=0){
  const gl=this.gl,rows=generatorGeometry(effect,settings),program=this.program(geometryFragment,geometryVertex);this.bind(target);gl.useProgram(program.p);gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferData(gl.ARRAY_BUFFER,rows,gl.DYNAMIC_DRAW);
  for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,4,gl.FLOAT,false,48,i*16);gl.vertexAttribDivisor(i,1);}
  gl.uniform2f(this.location(program,'resolution'),target.w,target.h);gl.uniform1i(this.location(program,'cloud'),effect==='smoke'?1:0);gl.uniform1i(this.location(program,'motionKind'),effect==='sparks'?1:effect==='lightning'?2:0);gl.uniform1f(this.location(program,'geometryTime'),time);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArraysInstanced(gl.TRIANGLES,0,6,rows.length/12);this.drawCount++;gl.disable(gl.BLEND);
  for(let i=0;i<3;i++){gl.vertexAttribDivisor(i,0);gl.disableVertexAttribArray(i);}gl.bindVertexArray(null);const error=gl.getError();if(error)throw Error('生成器几何渲染错误 '+error);
 }
 ribbon(target,path,parameters,settings,style){
  const gl=this.gl,defines=parameters.specs.map(p=>'#define '+p.variable+' gp['+p.slot+']').join('\n'),film=style==='membrane',program=film?this.program(membraneFragment(defines),membraneVertex(path,defines)):this.program(ribbonFragment,ribbonVertex(path,defines,{particles:style==='strands'}));
  this.bind(target);gl.useProgram(program.p);gl.bindVertexArray(this.vao);
  const data=new Float32Array(64);data.set(parameters.values);const size=program.sizes.get('gp[0]');if(size)gl.uniform1fv(this.location(program,'gp[0]'),data.subarray(0,size));
  gl.uniform1f(this.location(program,'generatorSeed'),settings.seed);gl.uniform1f(this.location(program,'time'),parameters.time);gl.uniform2f(this.location(program,'generatorResolution'),target.w,target.h);
  const work=ribbonWork(settings,target.w),{steps,layers}=work,strands=film?128:work.strands;
  gl.uniform1i(this.location(program,'ribbonSteps'),steps);gl.uniform1i(this.location(program,'ribbonStrands'),strands);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,(steps+1)*2,strands*layers);this.drawCount++;
  gl.disable(gl.BLEND);gl.bindVertexArray(null);const error=gl.getError();if(error)throw messageError('errors.ribbonGeometry',error);
 }
 render(type,values,w,h,libraries,time=0){
  const definition=type.definition,spec=definition.generator,clock=spec.usesTime&&definition.parameters.some(p=>p.variable==='motionSpeed'&&values[p.slot]===0)?0:time,key=JSON.stringify([type.id,spec,values,w,h,type.usesTime?clock:0]);this.pinned.add(key);
  if(this.cache.has(key)){const cached=this.cache.get(key);this.cache.delete(key);this.cache.set(key,cached);return cached;}
  const common=['math-v1',...(spec.effect==='pipeline'?spec.helpers??[]:spec.libraries.filter(n=>n.includes('common')||n.includes('simplex')))].map(name=>libraries[name]).join('\n');
  const parameters={specs:definition.parameters,values,time:clock},settings=Object.fromEntries(definition.parameters.map(p=>[p.variable,values[p.slot]]));
  const targets=[],allocate=(scalar=false,blend=false)=>{const target=this.target(w,h,{scalar,blend});targets.push(target);return target;};
  let output;
  try{
   output=allocate();
   const blurred=(source,radius,scalar=false,wrap=false)=>{if(radius<=0)return source;const horizontal=allocate(scalar),vertical=allocate(scalar);this.fullscreen(horizontal,blur,'',parameters,[source],{direction:[1/w,0],radius,wrap});this.fullscreen(vertical,blur,'',parameters,[horizontal],{direction:[0,1/h],radius,wrap});return vertical;};
   if(spec.effect==='pipeline'){
    const outputs=new Map();
    for(const [index,pass]of spec.passes.entries()){
     const scale=pass.scale??1,target=index===spec.passes.length-1?output:this.target(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
     if(target!==output)targets.push(target);
     try{this.fullscreen(target,libraries[pass.program],common,parameters,pass.inputs.map(id=>outputs.get(id)));}catch(error){throw messageError("errors.generatorStep", pass.id, error.message);}
     outputs.set(pass.id,target);
     const pending=new Set(spec.passes.slice(index+1).flatMap(p=>p.inputs));
     for(const [id,old]of outputs)if(old!==output&&!pending.has(id)){this.release(old);targets.splice(targets.indexOf(old),1);outputs.delete(id);}
    }
   }else if(spec.effect==='ribbon'){
    const sharp=allocate(false,true);this.ribbon(sharp,libraries[spec.programs.path],parameters,settings,spec.style);
    const glow=blurred(sharp,settings.softGlow*h/128,false,settings.seamlessU>.5);
    this.fullscreen(output,libraries[spec.programs.color],common,parameters,[sharp,glow]);
   }else if(spec.effect==='smoke'||spec.effect==='fog'){
    let density=allocate(true,spec.effect==='smoke');
    if(spec.effect==='smoke')this.geometry(density,'smoke',settings);else this.fullscreen(density,libraries[spec.programs.density],common,parameters);
    density=blurred(density,Math.min(settings.softness*8*h/1024,15),true);
    this.fullscreen(output,libraries[spec.programs.color],common,parameters,[density]);
   }else if(spec.effect==='sparks'||spec.effect==='lightning'){
    const sharp=allocate(false,true);this.geometry(sharp,spec.effect,settings,spec.usesTime?clock*(settings.motionSpeed??1):0);
    const radius=settings.glowSize??(1+settings.glow*3),small=blurred(sharp,radius*h/1024),large=blurred(sharp,radius*4*h/1024);
    this.fullscreen(output,libraries[spec.programs.color],common,parameters,[sharp,small,large],{bloom:spec.effect==='lightning'?[settings.coreGlow*.25,settings.outerGlow*.2]:[settings.glow*.6,settings.glow*.2],intensity:settings.intensity??1});
   }else this.fullscreen(output,libraries[spec.programs.color],common,parameters);
   this.cache.set(key,output);
   // Never evict textures pinned by the current host draw.
   let bytes=[...this.cache.values()].reduce((n,t)=>n+t.bytes,0);
   for(const [old,target]of this.cache){if(this.cache.size<=8&&bytes<=128*1024*1024)break;if(this.pinned.has(old))continue;this.cache.delete(old);bytes-=target.bytes;this.release(target);}
   return output;
  }catch(error){this.release(output);throw error;}
  finally{for(const target of targets)if(target!==output)this.release(target);this.gl.bindVertexArray(null);this.gl.disable(this.gl.BLEND);}
 }
 destroy(){for(const t of this.cache.values())this.release(t);this.cache.clear();for(const p of this.programs.values())this.gl.deleteProgram(p.p);this.programs.clear();this.gl.deleteBuffer(this.instances);this.gl.deleteVertexArray(this.vao);}
}
