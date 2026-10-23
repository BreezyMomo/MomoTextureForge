import {noiseWarpActive} from './noise-warp.js';
import {NORMAL_GLSL,setNormalUniforms} from './normal-map.js';
import {CURVES_GLSL,curveUniforms,hasChannelCurves} from './channel-curves.js';
import {channelSourceSelection,sanitizeChannelSources} from './output-channels.js';
import {contentEffectActive} from './content-effects.js';
import {FX_GLSL,applyPostFx,specializeFxShader} from './post-fx.js';
import {effectsUseTime,effectEnabled,effectValues} from './post-effect-specs.js';
import {resources} from './resource-assets.js';
import {formulaTime} from './formula-time.js';
import {contourPasses} from './contour.js';
import {Renderer,VERTEX_GLSL} from './renderer.js';
import {defaults,newLayer} from './state.js';
import {canvasRoot,evaluateNode,placements,find,nodeClock,shiftedProgress,instanceChildren,scatterOptions,walk} from './tree-model.js';
import {CATALOG} from './catalog.js';
import {generateArrangement,densitySampler} from './arrangement-layouts.js';
import {alphaFootprint} from './scatter-footprints.js';
import {fitInstances} from './instance-geometry.js';
import {advancedRecords,modifyRecords} from './tree-arrangement.js';
import {coverageContours} from './coverage-contours.js';
import {UNIT_BOUNDS,boundsSize,unitBounds,unionBounds,expandBounds,neededBounds,boundedPlacement,transformBounds,recordPlacement,transformPlacement,effectMargins,periodicCopies} from './render-bounds.js';
import {shapeExtent} from './seamless.js';
const HEADER=`#version 300 es
precision highp float;precision highp int;in vec2 uv;
layout(location=0) out vec4 colorOut;layout(location=1) out vec4 heightOut;
uniform sampler2D srcColor,srcHeight,dstColor,dstHeight,maskTex,tableTex;
uniform vec4 placement;uniform vec4 pivotTurn;uniform int repeatNode,blendMode,operation,recordCount,recolor,hasDest,imageLuminance;
uniform vec3 lowColor,highColor;uniform int stopCount,inverted;uniform vec4 stops[8];uniform vec4 postA;uniform vec3 postB;
vec3 ramp(float h){if(stopCount<2)return mix(lowColor,highColor,clamp(h,0.,1.));vec3 c=stops[0].rgb;for(int i=1;i<8;i++){if(i>=stopCount)break;c=mix(c,stops[i].rgb,clamp((h-stops[i-1].a)/max(.00001,stops[i].a-stops[i-1].a),0.,1.));}return c;}
uniform float opacity;uniform vec2 contourStep;uniform vec2 physicalMetric;
vec2 inverseUV(vec2 p,vec4 box,vec4 axis){p-=box.xy;float c=cos(axis.z),s=sin(axis.z);p=mat2(c,-s,s,c)*(p*physicalMetric);p/=max(box.zw*physicalMetric,vec2(.000001));p.x*=axis.w;return p+axis.xy;}
vec4 filtered(sampler2D tex,vec2 p){ivec2 size=textureSize(tex,0);vec2 pos=p*vec2(size)-.5;ivec2 i=ivec2(floor(pos)),lo,hi;vec2 f=fract(pos);if(repeatNode==1){lo=ivec2(mod(vec2(i),vec2(size)));hi=ivec2(mod(vec2(i+1),vec2(size)));}else{lo=clamp(i,ivec2(0),size-1);hi=clamp(i+1,ivec2(0),size-1);}return mix(mix(texelFetch(tex,lo,0),texelFetch(tex,ivec2(hi.x,lo.y),0),f.x),mix(texelFetch(tex,ivec2(lo.x,hi.y),0),texelFetch(tex,hi,0),f.x),f.y);}
void sampleContent(vec2 p,out vec4 c,out float h){// Integrate the transformed pixel footprint when reducing an intermediate.
vec2 size=vec2(textureSize(srcColor,0)),dx=dFdx(p),dy=dFdy(p);
if(max(length(dx*size),length(dy*size))>1.01){c=vec4(0);h=0.;for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 q=p+dx*(float(x)*.5-.25)+dy*(float(y)*.5-.25);if(all(greaterThanEqual(q,vec2(0)))&&all(lessThan(q,vec2(1)))){c+=filtered(srcColor,q)*.25;h+=filtered(srcHeight,q).r*.25;}}}
else if(any(lessThan(p,vec2(0)))||any(greaterThanEqual(p,vec2(1)))){c=vec4(0);h=0.;}else{c=filtered(srcColor,p);h=filtered(srcHeight,p).r;}}
vec4 blendColor(vec4 dst,vec4 src,int mode){float a=src.a+dst.a*(1.-src.a);if(mode==0)return vec4(src.rgb+dst.rgb*(1.-src.a),a);vec3 d=dst.a>0.?dst.rgb/dst.a:vec3(0),s=src.a>0.?src.rgb/src.a:vec3(0);if(mode==10)return dst*src.a;if(mode==11)return dst*(1.-src.a);vec3 b=mode==6?abs(d-s):mode==7?mix(2.*d*s,1.-2.*(1.-d)*(1.-s),step(vec3(.5),d)):mode==8?(1.-2.*s)*d*d+2.*s*d:mode==9?min(vec3(1),d/max(vec3(.00001),1.-s)):mode==1?d+s:mode==2?max(d,s):mode==3?d*s:mode==4?max(d-s,0.):1.-(1.-d)*(1.-s);return vec4((1.-src.a)*dst.rgb+(1.-dst.a)*src.rgb+src.a*dst.a*b,a);}
float blendHeight(float d,float s,float a,int mode){if(mode==0)return s+d*(1.-a);if(mode==1)return d+s;if(mode==2)return max(d,s);if(mode==3)return mix(d,d*(a>0.?s/a:0.),a);if(mode==4)return max(d-s,0.);if(mode==6)return abs(d-s);if(mode==7)return d<.5?2.*d*s:1.-2.*(1.-d)*(1.-s);if(mode==8)return (1.-2.*s)*d*d+2.*s*d;if(mode==9)return min(1.,d/max(.00001,1.-s));if(mode==10)return d*a;if(mode==11)return d*(1.-a);return 1.-(1.-d)*(1.-s);}
${FX_GLSL}
${CURVES_GLSL}
void main(){vec4 c=vec4(0);float h=0.;
 if(operation==0){h=texture(srcHeight,uv).r;float a=clamp(h,0.,1.);c=vec4(ramp(h)*a,a);}
 if(operation==9){h=texture(srcHeight,uv).r;vec4 p=texture(srcColor,uv);if(imageLuminance==1)h=dot(p.rgb,vec3(.2126,.7152,.0722))*p.a;c=vec4((recolor==1?ramp(h):p.rgb)*p.a,p.a);}
 if(operation==5){h=texture(srcHeight,uv).r;c=vec4(texture(srcColor,uv).rgb,1.);}
 if(operation==1){vec2 p=inverseUV(uv,placement,pivotTurn);sampleContent(p,c,h);vec4 d=hasDest==1?texture(dstColor,uv):vec4(0);float dh=hasDest==1?texture(dstHeight,uv).r:0.;c*=opacity;h*=opacity;h=blendHeight(dh,h,c.a,blendMode);c=blendColor(d,c,blendMode);}
 if(operation==2){sampleContent(uv,c,h);float m=texture(maskTex,uv).r;if(inverted==1)m=1.-m;c*=clamp(m,0.,1.);h*=clamp(m,0.,1.);}
 if(operation==3){sampleContent(uv,c,h);if(recolor==1)c.rgb=ramp(h)*c.a;}
 if(operation==4){for(int i=0;i<recordCount;i++){vec4 box=texelFetch(tableTex,ivec2(i*3,0),0),axis=texelFetch(tableTex,ivec2(i*3+1,0),0);float alpha=texelFetch(tableTex,ivec2(i*3+2,0),0).x;vec4 sc;float sh;sampleContent(inverseUV(uv,box,axis),sc,sh);sc*=alpha;sh*=alpha;h=blendHeight(h,sh,sc.a,0);c=blendColor(c,sc,0);}}
 if(operation==6){sampleContent(uv,c,h);float old=h;h=(h-postA.w)/max(postB.x-postA.w,.0001);h=(h-.5)*postA.y+.5+postA.x;h=pow(max(h,0.),1./max(postA.z,.1));h=mix(postB.y,postB.z,h);if(inverted==1)h=1.-h;float a=clamp(h,0.,1.);c=vec4(recolor==1?ramp(h)*a:(c.a>0.?c.rgb/c.a:ramp(h))*a,a);if(recolor==0&&old>0.)c.rgb*=max(h,0.)/old;}
 if(operation==7){c=texture(srcColor,uv);h=texture(srcHeight,uv).r;
 for(int i=-1;i<=1;i+=2){vec2 p=uv+float(i)*contourStep;vec4 sc=vec4(0);float sh=0.;
 if(repeatNode==1)p=fract(p);if(all(greaterThanEqual(p,vec2(0)))&&all(lessThan(p,vec2(1)))){sc=filtered(srcColor,p);sh=filtered(srcHeight,p).r;}
 if((inverted==0&&sc.a>c.a)||(inverted==1&&sc.a<c.a)){c=sc;h=sh;}}
 }
 if(operation==8){c=texture(srcColor,uv);h=texture(srcHeight,uv).r;float a=max(0.,c.a-texture(dstColor,uv).a),ratio=c.a>0.?a/c.a:0.;c*=ratio;h*=ratio;}
 if(operation>=10)applyFx(c,h);
 if(operation==16)channelCurves(c,h);
 colorOut=c;heightOut=vec4(h,c.a,0,c.a);
}`;
const FINAL=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;uniform sampler2D srcColor,srcHeight;uniform int outputMode,transparent,channels[4];uniform vec3 background;uniform float strength;uniform vec2 pixel;
uniform sampler2D packR,packG,packB,packA;uniform int packModes[4];
float packed(sampler2D tex,int mode,float fallback){if(mode==0)return fallback;if(mode==6)return 0.;vec4 c=texture(tex,uv);if(mode>=7){vec3 rgb=c.a>0.?c.rgb/c.a:vec3(0);if(mode==7)return rgb.r;if(mode==8)return rgb.g;if(mode==9)return rgb.b;return dot(rgb,vec3(.2126,.7152,.0722));}if(mode==1)return dot(c.rgb,vec3(.2126,.7152,.0722));if(mode==2)return c.r;if(mode==3)return c.g;if(mode==4)return c.b;return c.a;}
float channel(int s,float v,vec3 n,vec4 c){if(s>=10){vec3 rgb=c.a>0.?c.rgb/c.a:vec3(0);if(s==10)return rgb.r;if(s==11)return rgb.g;if(s==12)return rgb.b;return dot(rgb,vec3(.2126,.7152,.0722));}if(s==0)return v;if(s==1)return 1.-v;if(s==2)return n.x*.5+.5;if(s==3)return n.y*.5+.5;if(s==4)return n.z*.5+.5;if(s==5)return 0.;if(s==6)return 1.;if(s==7)return .5;if(s==9)return clamp(length(n.xy),0.,1.);return c.a;}
float h(vec2 p){return texture(srcHeight,clamp(p,vec2(0),vec2(1))).r;}
${NORMAL_GLSL}
void main(){vec4 c=texture(srcColor,uv);float v=h(uv);vec3 n=vec3(0,0,1);bool needsNormal=outputMode==2;for(int i=0;i<4;i++)if(outputMode==3&&packModes[i]==0&&((channels[i]>=2&&channels[i]<=4)||channels[i]==9))needsNormal=true;if(needsNormal)n=surfaceNormal(uv);
 if(outputMode==1)frag=vec4(vec3(v),transparent==1?c.a:1.);else if(outputMode==2)frag=vec4(n*.5+.5,1.);else if(outputMode==3)frag=vec4(packed(packR,packModes[0],channel(channels[0],v,n,c)),packed(packG,packModes[1],channel(channels[1],v,n,c)),packed(packB,packModes[2],channel(channels[2],v,n,c)),packed(packA,packModes[3],channel(channels[3],v,n,c)));else frag=vec4(transparent==1?(c.a>0.?c.rgb/c.a:vec3(0)):c.rgb+background*(1.-c.a),transparent==1?c.a:1.);
}`;
function fitted(t,w,h){if(t.fit!=='contain')return [t.width,t.height];const side=Math.min(t.width*w,t.height*h);return [side/w,side/h];}
const blendIds={over:0,add:1,max:2,multiply:3,subtract:4,screen:5,difference:6,overlay:7,softlight:8,dodge:9,mask:10,inverseMask:11};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
export class TreeRenderer{
 constructor(canvas){this.base=new Renderer(canvas);this.canvas=canvas;this.gl=this.base.gl;this.float=this.base.float;this.programs=new Map();this.uniforms=new Map();this.pool=[];this.reclaimable=new Set();this.cache=new Map();this.live=new Set();this.allocated=0;this.usedKeys=new Set();this.budget=256*1024*1024;this.lastCounts=new Map();}
 program(final=false,operation=0){const key=final?'final':operation>=32&&operation<=45?'effect:'+operation:'tree';if(this.programs.has(key))return this.programs.get(key);const gl=this.gl,compile=(src,type)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(msg);}return s;};const v=compile(VERTEX_GLSL,gl.VERTEX_SHADER),f=compile(final?FINAL:specializeFxShader(HEADER,operation),gl.FRAGMENT_SHADER),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));this.programs.set(key,p);return p;}
 location(program,name){let locations=this.uniforms.get(program);if(!locations){locations=new Map();this.uniforms.set(program,locations);}if(!locations.has(name))locations.set(name,this.gl.getUniformLocation(program,name));return locations.get(name);}
 discard(t){for(const tex of t.textures)this.gl.deleteTexture(tex);this.gl.deleteFramebuffer(t.fb);this.allocated-=t.bytes;}
 trimPool(limit=0){while(this.pool.length&&this.allocated>limit)this.discard(this.pool.shift());}
 target(w,h,colorOnly=false,aspect=w/h){const gl=this.gl,bytes=w*h*(this.float?(colorOnly?16:20):(colorOnly?4:5));
 const index=this.pool.findIndex(t=>t.w===w&&t.h===h&&t.colorOnly===colorOnly);
 if(index>=0){const t=this.pool.splice(index,1)[0];t.aspect=aspect;t.bounds=UNIT_BOUNDS;this.live.add(t);gl.bindFramebuffer(gl.FRAMEBUFFER,t.fb);gl.drawBuffers(colorOnly?[gl.COLOR_ATTACHMENT0]:[gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);return t;}
 this.trimPool(this.budget-bytes);
 // Old-state caches are not inputs of this frame. Evict before allocation, not only after success.
 if(this.allocated+bytes>this.budget)for(const [key,cached]of this.cache){if(!this.usedKeys.has(key)||this.reclaimable.has(cached)){this.release(cached);this.cache.delete(key);this.trimPool(this.budget-bytes);if(this.allocated+bytes<=this.budget)break;}}
 if(this.allocated+bytes>this.budget)throw Error('渲染超过中间纹理预算，请简化嵌套或降低导出尺寸');
 const t={w,h,aspect,bytes,colorOnly,bounds:UNIT_BOUNDS,textures:[],fb:gl.createFramebuffer()};gl.bindFramebuffer(gl.FRAMEBUFFER,t.fb);
 for(let i=0;i<(colorOnly?1:2);i++){const tex=gl.createTexture();t.textures.push(tex);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,this.float?(i?gl.R32F:gl.RGBA32F):(i?gl.R8:gl.RGBA8),w,h,0,i?gl.RED:gl.RGBA,this.float?gl.FLOAT:gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,tex,0);}
 gl.drawBuffers(colorOnly?[gl.COLOR_ATTACHMENT0]:[gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE||gl.getError()){t.textures.forEach(x=>gl.deleteTexture(x));gl.deleteFramebuffer(t.fb);throw Error('浏览器或显卡无法分配当前渲染缓冲，请关闭其他图形程序后重试');}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);this.live.add(t);this.allocated+=bytes;return t;}
 release(t){if(!t||!this.live.delete(t))return;this.reclaimable.delete(t);if(this.streaming)this.discard(t);else this.pool.push(t);}
 boundedTarget(w,h,bounds=UNIT_BOUNDS,aspect=w/h){const [sx,sy]=boundsSize(bounds),limit=Math.min(4096,this.base.maxSize),shrink=Math.min(1,limit/Math.max(w*sx,h*sy)),out=this.target(Math.max(1,Math.ceil(w*sx*shrink)),Math.max(1,Math.ceil(h*sy*shrink)),false,aspect);out.bounds=bounds;return out;}
 consumed(t){if(t.repeatHeld)return;if(this.streaming){if(!t.streamHeld)this.release(t);}else this.reclaimable.add(t);}
 clearStreamSources(){for(const t of this.streamSources?.values()??[]){t.streamHeld=false;this.release(t);}this.streamSources?.clear();}
 composite(out,src,options){
  if(options.repeat&&options.op===1){
   const box=options.box??[.5,.5,1,1],axis=options.axis??[.5,.5,0,1],copies=periodicCopies(box,axis,src.bounds,out.aspect);
   this.reclaimable.delete(src);src.repeatHeld=(src.repeatHeld??0)+1;
   try{if((options.blend??'over')!=='over'){let wrapped=this.target(out.w,out.h,false,out.aspect);wrapped.bounds=out.bounds;for(const box of copies)wrapped=this.composite(wrapped,src,{...options,box,opacity:1,blend:'over',repeat:false});out=this.composite(out,wrapped,{...options,box:[.5,.5,1,1],axis:[.5,.5,0,1],repeat:false});}else for(const box of copies)out=this.composite(out,src,{...options,box,repeat:false});}
   finally{src.repeatHeld--;this.consumed(src);}return out;
  }
  if(this.streaming&&this.overBlend&&(options.blend??'over')==='over'){this.pass(out,{...options,source:src,inPlace:true});this.consumed(src);return out;}
  const next=this.target(out.w,out.h,false,out.aspect);next.bounds=out.bounds;this.pass(next,{...options,source:src,dest:out});this.consumed(src);this.release(out);return next;
 }
 clearCache(){for(const t of this.cache.values())this.release(t);this.cache.clear();this.trimPool();}
 pass(target,{source=null,dest=null,mask=null,op=3,box=[.5,.5,1,1],axis=[.5,.5,0,1],repeat=false,opacity=1,blend='over',palette=['#000000','#ffffff'],recolor=false,imageLuminance=false,post=[0,1,1,0,1,0,1],inverted=false,contourStep=[0,0],table=null,count=0,inPlace=false,fxAmount=0,fxThreshold=0,fxData=[],fxColors=[],curves=null}={}){
 if(op===1)({box,axis}=boundedPlacement(box,axis,source?.bounds,target.bounds));
 else if(![0,4,5,9].includes(op))target.bounds=source?.bounds??UNIT_BOUNDS;
 const gl=this.gl,p=this.program(false,op);gl.useProgram(p);const loc=n=>this.location(p,n);gl.bindFramebuffer(gl.FRAMEBUFFER,target.fb);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);gl.viewport(0,0,target.w,target.h);gl.disable(gl.BLEND);
 const fallback=source?.textures[0]??dest?.textures[0]??mask?.textures[0];if(!fallback)return;
 const textures=[source?.textures[0],source?.textures[1],dest?.textures[0],dest?.textures[1],mask?.textures[1],table];
 ['srcColor','srcHeight','dstColor','dstHeight','maskTex','tableTex'].forEach((name,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]??fallback);gl.uniform1i(loc(name),i);});
 if(curves){const u=curveUniforms(curves);gl.uniform3fv(loc('curvePoints[0]'),u.data);gl.uniform1iv(loc('curveCounts[0]'),u.counts);}
 const data=new Float32Array(12),colors=new Float32Array(9);data.set(fxData.slice(0,12));colors.set(fxColors.slice(0,9));gl.uniform4fv(loc('fxData[0]'),data);gl.uniform3fv(loc('fxColors[0]'),colors);const bounds=target.bounds,short=Math.min(target.aspect,1);gl.uniform4fv(loc('fxBounds'),[bounds[0],bounds[1],...boundsSize(bounds)]);gl.uniform2fv(loc('fxMetric'),[target.aspect/short,1/short]);
 gl.uniform1f(loc('fxAmount'),fxAmount);gl.uniform1f(loc('fxThreshold'),fxThreshold);const [bw,bh]=boundsSize(target.bounds),metricAspect=target.aspect*bw/bh;gl.uniform2fv(loc('physicalMetric'),[metricAspect,1]);gl.uniform2fv(loc('contourStep'),contourStep);gl.uniform1i(loc('inverted'),+inverted);gl.uniform4fv(loc('postA'),post.slice(0,4));gl.uniform3fv(loc('postB'),post.slice(4));const stops=palette.stops??[];gl.uniform1i(loc('stopCount'),stops.length);const stopData=new Float32Array(32);stops.forEach((s,i)=>stopData.set([...rgb(s.color),s.position],i*4));gl.uniform4fv(loc('stops[0]'),stopData);
 gl.uniform1i(loc('imageLuminance'),+imageLuminance);gl.uniform1i(loc('hasDest'),dest?1:0);gl.uniform1i(loc('operation'),op);gl.uniform1i(loc('repeatNode'),+repeat);gl.uniform1i(loc('blendMode'),blendIds[blend]);gl.uniform1i(loc('recolor'),+recolor);gl.uniform1i(loc('recordCount'),count);gl.uniform1f(loc('opacity'),opacity);gl.uniform4fv(loc('placement'),box);gl.uniform4fv(loc('pivotTurn'),axis);gl.uniform3fv(loc('lowColor'),rgb(palette[0]));gl.uniform3fv(loc('highColor'),rgb(palette[1]));if(inPlace){gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);if(!repeat){const c=Math.cos(axis[2]),s=Math.sin(axis[2]),corners=[0,1].flatMap(x=>[0,1].map(y=>{const dx=(x-axis[0])*axis[3]*box[2],dy=(y-axis[1])*box[3];return [box[0]+c*dx-s*dy/metricAspect,box[1]+s*dx*metricAspect+c*dy];})),x0=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0]))*target.w)-2),y0=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1]))*target.h)-2),x1=Math.min(target.w,Math.ceil(Math.max(...corners.map(p=>p[0]))*target.w)+2),y1=Math.min(target.h,Math.ceil(Math.max(...corners.map(p=>p[1]))*target.h)+2);gl.enable(gl.SCISSOR_TEST);gl.scissor(x0,y0,Math.max(0,x1-x0),Math.max(0,y1-y0));}}gl.drawArrays(gl.TRIANGLES,0,3);
 const err=gl.getError();gl.disable(gl.BLEND);gl.disable(gl.SCISSOR_TEST);if(err)throw Error('节点渲染错误 '+err);
 }
 table(records,source=UNIT_BOUNDS,target=UNIT_BOUNDS,repeat=false,aspect=1){
 const limit=Math.min(4096,Math.floor(this.base.maxSize/3));
 if(repeat){const copies=[];for(const r of records){const p=recordPlacement(r);for(const box of periodicCopies(p.box,p.axis,source,aspect,limit-copies.length))copies.push({...r,x:box[0],y:box[1]});}records=copies;}
 const gl=this.gl,tex=gl.createTexture(),data=new Float32Array(Math.max(1,records.length)*12);records.forEach((r,i)=>{const p=boundedPlacement([r.x,r.y,r.width,r.height],[.5,.5,r.turn,r.mirror??1],source,target);data.set([...p.box,...p.axis,r.opacity??1,0,0,0],i*12);});gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,Math.max(3,records.length*3),1,0,gl.RGBA,gl.FLOAT,data);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);return {texture:tex,count:records.length};}
 visibleFootprint(n,progress){
  this.footprintCache??=new Map();const key=JSON.stringify([this.packSelection?.id??null,n,progress,this.formulaSeconds??0]);
  if(this.footprintCache.has(key))return this.footprintCache.get(key);
  const quality=this.quality,limit=this.sampleLimit;let src;
  try{
   this.quality=1;this.sampleLimit=256;src=this.content(n,progress,128,128,['#000000','#ffffff'],1,expandBounds(UNIT_BOUNDS,4));
   const gl=this.gl,pixels=this.float?new Float32Array(src.w*src.h*4):new Uint8Array(src.w*src.h*4);
   gl.bindFramebuffer(gl.FRAMEBUFFER,src.fb);gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(0,0,src.w,src.h,gl.RGBA,this.float?gl.FLOAT:gl.UNSIGNED_BYTE,pixels);
   if(gl.getError())throw Error('可见范围采样失败，请重试预览');
   const bounds=alphaFootprint(pixels,src.w,src.h),[sx,sy]=boundsSize(src.bounds);bounds.x=(bounds.x+.5)*sx+src.bounds[0]-.5;bounds.y=(bounds.y+.5)*sy+src.bounds[1]-.5;bounds.radius*=Math.max(sx,sy);this.footprintCache.set(key,bounds);
   while(this.footprintCache.size>256)this.footprintCache.delete(this.footprintCache.keys().next().value);
   return bounds;
  }finally{this.release(src);this.quality=quality;this.sampleLimit=limit;}
 }
 records(n,time,{original=n,aspect=1}={}){
  if(this.packSelection){const selection=this.packSelection;this.packSelection=null;try{return this.records(n,time,{original,aspect});}finally{this.packSelection=selection;}}
  if(n.arrange[0]===14){
   if(n.kind!=='group'||!n.children.length)throw Error('沿轮廓排列需要组合：第一个子节点为轮廓来源，后续子节点为装饰');
   this.layoutCache??=new Map();const key='outline:'+JSON.stringify([n,time,this.formulaSeconds,aspect]);if(this.layoutCache.has(key))return this.layoutCache.get(key);
   const quality=this.quality,limit=this.sampleLimit;let src,records;
   try{this.quality=1;this.sampleLimit=256;src=this.content({kind:'group',children:[n.children[0]],boundary:'clip'},time,256,256,['#000000','#ffffff'],aspect);
    const gl=this.gl,raw=this.float?new Float32Array(256*256*4):new Uint8Array(256*256*4);gl.bindFramebuffer(gl.FRAMEBUFFER,src.fb);gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(0,0,256,256,gl.RGBA,this.float?gl.FLOAT:gl.UNSIGNED_BYTE,raw);if(gl.getError())throw Error('轮廓采样失败，请重试');
    const data=this.float?raw:Float32Array.from(raw,v=>v/255),outline=coverageContours(data,256,256,n.arrangeExtra.threshold),loops=outline.paths.map(p=>p.knots.map(k=>[k.points[0]/256,k.points[1]/256]));
    records=modifyRecords(fitInstances(advancedRecords(n,aspect,loops),aspect,n.arrangeFit),n,aspect);
   }finally{this.release(src);this.quality=quality;this.sampleLimit=limit;}
   this.layoutCache.set(key,records);while(this.layoutCache.size>128)this.layoutCache.delete(this.layoutCache.keys().next().value);return records;
  }
  const measured=n.scatterAvoidOverlap&&[7,12].includes(n.arrange[0]);
  if(!measured&&n.arrange[0]!==12)return placements(n.arrange,n,time,original,aspect);
  this.layoutCache??=new Map();const key=JSON.stringify([n,time,this.formulaSeconds??0,aspect]);
  if(this.layoutCache.has(key))return this.layoutCache.get(key);
  const options=scatterOptions(n,aspect);
  if(n.arrange[0]===12){const s=defaults();s.layers[0]=newLayer(CATALOG[n.arrange[39]].id);s.layers[0].params=n.arrange.slice(42,58);s.output.mode=1;const pix=this.base.draw(s,128,128,{time,read:true,float:this.float});options.density=densitySampler(pix,128);}
  if(measured){const footprints=new Map();options.footprint=index=>{
   const phase=shiftedProgress(time,index*n.instancePhase),children=instanceChildren(n,index),content=n.instancePhase?evaluateNode(original,0,phase).node:n;
   // Identical variants/phases share one readback; no full-region reservation for a small child.
   const variant=JSON.stringify([children,phase]);if(!footprints.has(variant))footprints.set(variant,this.visibleFootprint({...content,children},phase));return footprints.get(variant);
  };}
  const records=modifyRecords(fitInstances(generateArrangement(n.arrange,options).map(p=>({...p,width:Math.min(1,p.size),height:Math.min(1,p.size),turn:-p.turn})),aspect,n.arrangeFit),n,aspect);
  this.layoutCache.set(key,records);while(this.layoutCache.size>128)this.layoutCache.delete(this.layoutCache.keys().next().value);return records;
 }
 contentBounds(n,progress,aspect=1,need=UNIT_BOUNDS){
 if(n.boundary!=='visible')return UNIT_BOUNDS;
 if(n.kind==='shape'){
  const def=CATALOG.find(p=>p.id===n.type)?.definition;
  if(resources.get(n.type)?.kind==='image'||def?.generator||def?.outputs.vector)return UNIT_BOUNDS;

  const uv=n.uv??[1,0,0,0,0,0,0],plain=!n.polar&&uv.every((v,i)=>v===[1,0,0,0,0,0,0][i]);
  let range=need??UNIT_BOUNDS;
  if(def?.renderPadding&&plain)range=expandBounds(UNIT_BOUNDS,def.renderPadding);
  else if(def?.seamless.extent&&!n.polar&&!uv.slice(2).some(Boolean))range=expandBounds(UNIT_BOUNDS,Math.max(0,(shapeExtent(n.type,n.params,n.bezier?.shape)*uv[0]-1)*.5));
  return need?neededBounds(range,need):range;
 }
 let bounds=UNIT_BOUNDS;
 for(const child of n.children){if(this.packSelection&&!this.packSelection.ids.has(child.id))continue;const e=evaluateNode(child,progress);if(!e.visible)continue;const p=transformPlacement(e.node.transform,aspect),childAspect=aspect*p.box[2]/p.box[3],request=need?transformBounds(need,p.box,p.axis,aspect,true):null,range=this.measureNode(child,progress,childAspect,request);bounds=unionBounds(bounds,transformBounds(range,p.box,p.axis,aspect));}
 return need?neededBounds(bounds,need):bounds;
 }
 measureNode(original,parentTime,aspect=1,need=UNIT_BOUNDS){
 if(original.boundary!=='visible'&&!original.tracks?.boundary)return UNIT_BOUNDS;
 this.measureCache??=new Map();const key=JSON.stringify([original,parentTime,aspect,need]);if(this.measureCache.has(key))return this.measureCache.get(key);
 if((this.measureOperations=(this.measureOperations??0)+1)>8192)throw Error('超框边界计算超过预算，请减少嵌套排列');
 const e=evaluateNode(original,parentTime),bounds=e.visible?this.nodeBounds(e.node,e.progress,aspect,need,original,parentTime):UNIT_BOUNDS;this.measureCache.set(key,bounds);return bounds;
 }
 nodeBounds(n,progress,aspect,need,original=n,parentTime=progress,records=null){
 if(n.boundary!=='visible')return UNIT_BOUNDS;
 const [mx,my]=effectMargins(n,aspect),input=need?expandBounds(need,mx,my):null;let bounds=UNIT_BOUNDS;
 if(n.arrange[0]){
  records??=this.records(n,progress,{original,aspect});
  for(let i=0;i<records.length;i++){const r=records[i],p=recordPlacement(r),phase=shiftedProgress(progress,i*n.instancePhase),content={...(n.instancePhase?evaluateNode(original,parentTime,phase).node:n),children:instanceChildren(n,i,r)},request=input?transformBounds(input,p.box,p.axis,aspect,true):null,range=this.contentBounds(content,phase,aspect*r.width/r.height,request);bounds=unionBounds(bounds,transformBounds(range,p.box,p.axis,aspect));}
  if(n.arrange[0]===14&&n.arrangeExtra.showSource)bounds=unionBounds(bounds,this.contentBounds({...n,children:[n.children[0]]},progress,aspect,input));
 }else bounds=this.contentBounds(n,progress,aspect,input);
 bounds=expandBounds(bounds,mx,my);return need?neededBounds(bounds,need):bounds;
 }
 content(n,progress,w,h,palette,aspect=w/h,need=UNIT_BOUNDS,renderBounds=null){
 // A repeated arrangement wraps the whole layout; its source may cross cell edges.
 if(n.boundary==='repeat'&&n.arrange[0])n={...n,boundary:'visible'};
 w=Math.min(w,this.sampleLimit);h=Math.min(h,this.sampleLimit);
 if(n.kind==='shape'&&this.quality>1){w=Math.min(4096,this.base.maxSize,w*this.quality);h=Math.min(4096,this.base.maxSize,h*this.quality);}
 let out=this.boundedTarget(w,h,renderBounds??this.contentBounds(n,progress,aspect,need),aspect);
 if(n.kind==='shape'){
  if(n.boundary==='repeat'&&CATALOG.find(p=>p.id===n.type)?.definition.renderPadding){
   const src=this.content({...n,boundary:'visible'},progress,w/this.quality,h/this.quality,palette,aspect,null);return this.composite(out,src,{op:1,repeat:true});
  }
  const definition=CATALOG.find(p=>p.id===n.type)?.definition,imageResource=resources.get(n.type)?.kind==='image',fit=imageResource&&n.imageFit!=='stretch'&&Math.abs(aspect-1)>1e-9,framed=fit||!unitBounds(out.bounds)&&(imageResource||definition?.generator||definition?.outputs.vector);
  const [cw,ch]=fit?fitted({fit:'contain',width:1,height:1},aspect,1):[1,1],sw=framed?Math.max(1,Math.ceil(w*cw)):out.w,sh=framed?Math.max(1,Math.ceil(h*ch)):out.h,design=framed?this.target(sw,sh,false,fit?1:aspect):out;
  const s=defaults();s.layers[0]=newLayer(n.type);s.layers[0].params=n.params;if(n.type==='BezierRibbon')s.layers[0].bezierTail=n.bezier?.shape;s.layers[0].uv=n.uv;s.layers[0].polar=n.polar;s.output.mode=1;s.output.seamless=CATALOG.find(p=>p.id===n.type)?.definition.renderPadding?false:(n.boundary==='repeat');s.output.seamMode=n.seamMode;s.output.seamBlend=n.seamBlend;s.animation.duration=1;s.animation.speed=1;
  const raw=this.base.draw(s,sw,sh,{time:progress,formulaTime:formulaTime(n,this.formulaSeconds),float:this.float,retainTexture:true,preserveSeamlessScale:true,treeEdges:true,sampleOffset:design.bounds.slice(0,2),sampleScale:boundsSize(design.bounds)});let vector=null;const image=(resources.get(n.type)?.kind==='image'&&n.params[0]<.5&&n.color.mode==='inherit')||!!CATALOG.find(p=>p.id===n.type)?.definition.generator;try{if(image||CATALOG.find(p=>p.id===n.type)?.vector){s.output.mode=0;vector=this.base.draw(s,sw,sh,{time:progress,formulaTime:formulaTime(n,this.formulaSeconds),float:this.float,retainTexture:true,preserveSeamlessScale:true,treeEdges:true,sampleOffset:design.bounds.slice(0,2),sampleScale:boundsSize(design.bounds)});}this.pass(design,{source:{textures:[vector?.texture??raw.texture,raw.texture]},op:image?9:vector?5:0,palette,imageLuminance:imageResource&&n.params[0]<.5&&n.color.mode==='inherit',recolor:!!CATALOG.find(p=>p.id===n.type)?.definition.generator&&['own','remap'].includes(n.color.mode)});}finally{this.gl.deleteTexture(raw.texture);if(vector)this.gl.deleteTexture(vector.texture);}if(framed){out=this.composite(out,design,{op:1,box:[.5,.5,cw,ch],repeat:(n.boundary==='repeat')});this.release(design);}return out;
 }
 for(const child of n.children){if(this.packSelection&&!this.packSelection.ids.has(child.id))continue;const e=evaluateNode(child,progress);if(!e.visible)continue;const t=e.node.transform,[cw,ch]=fitted(t,aspect,1);
  const src=this.renderNode(child,progress,Math.max(1,Math.ceil(w*cw)),Math.max(1,Math.ceil(h*ch)),palette,aspect*cw/ch,n.boundary==='repeat'?null:transformBounds(out.bounds,[t.x,t.y,cw,ch],[t.pivotX,t.pivotY,t.rotation*Math.PI/180,t.mirrorX?-1:1],aspect,true));
  out=this.composite(out,src,{op:1,box:[t.x,t.y,cw,ch],axis:[t.pivotX,t.pivotY,t.rotation*Math.PI/180,t.mirrorX?-1:1],opacity:e.node.opacity,blend:this.packSelection?.path.has(child.id)?'over':e.node.blend,repeat:(n.boundary==='repeat')});
 }
 return out;
 }
 // Only the arranged source is retained here; node effects and placement remain separate.
 cachedContent(n,progress,w,h,palette,aspect=w/h,need=UNIT_BOUNDS){
 const key='content:'+JSON.stringify([this.packSelection?.id??null,this.formulaSeconds,this.quality,n.id,n.kind,n.type,n.imageFit,n.boundary,need,n.params,n.shapeClock,n.uv,n.polar,(n.boundary==='repeat'),n.seamMode,n.seamBlend,n.children,progress,w,h,aspect,palette,palette.stops]);
 if(this.streaming){
  this.streamSources??=new Map();if(this.streamSources.has(key)){const t=this.streamSources.get(key);this.streamSources.delete(key);this.streamSources.set(key,t);return t;}
  const out=this.content(n,progress,w,h,palette,aspect,need);out.streamHeld=true;this.streamSources.set(key,out);
  while(this.streamSources.size>2){const first=this.streamSources.keys().next().value,t=this.streamSources.get(first);this.streamSources.delete(first);t.streamHeld=false;this.release(t);}return out;
 }
 this.usedKeys.add(key);if(this.cache.has(key)){const t=this.cache.get(key);this.reclaimable.delete(t);return t;}
 const out=this.content(n,progress,w,h,palette,aspect,need);if(!this.streaming)this.cache.set(key,out);return out;
 }
 renderNode(original,parentTime,w,h,inherited=['#000000','#ffffff'],aspect=w/h,need=UNIT_BOUNDS){
 if(++this.operations>4096&&!this.streaming)throw Error('本帧节点求值超过4096次，请减少嵌套排列或时间偏移');
 if(w>4096||h>4096||w>this.base.maxSize||h>this.base.maxSize)throw Error('节点采样尺寸超过显卡或4096上限');
 const e=evaluateNode(original,parentTime),n=e.node,palette=['own','remap'].includes(n.color.mode)?Object.assign([n.color.fill==='solid'?n.color.high:n.color.low,n.color.high],{stops:n.color.fill==='solid'?undefined:n.color.stops}):inherited;
 const animated=x=>effectsUseTime(x)||Object.keys(x.tracks).length||x.uv[4]!==0||x.timing.outside==='hide'||x.timing.before==='hide'||x.timing.after==='hide'||x.instancePhase||x.kind==='shape'&&x.shapeClock?.follow!==false&&CATALOG.find(p=>p.id===x.type)?.usesTime||x.children.some(animated)||x.mask&&animated(x.mask);
 const key=JSON.stringify([this.packSelection?.id??null,this.quality,original,animated(original)?[e.progress,this.formulaSeconds]:0,e.visible,w,h,aspect,need,palette,palette.stops]);this.usedKeys.add(key);if(this.cache.has(key)){const t=this.cache.get(key);this.reclaimable.delete(t);this.cache.delete(key);this.cache.set(key,t);for(const [id,count]of t.layoutCounts??[])this.lastCounts.set(id,count);return t;}
 if(!e.visible){const blank=this.target(w,h,false,aspect);if(!this.streaming)this.cache.set(key,blank);return blank;}
 const records=this.records(n,e.progress,{original,aspect});this.lastCounts.set(n.id,records.length);const needsFullWarp=(effectEnabled(n,'noiseWarp')&&noiseWarpActive(effectValues(n,'noiseWarp')))||['shockwave','liquidFusion'].some(id=>effectEnabled(n,id)&&contentEffectActive(id,effectValues(n,id)));const effectNeed=needsFullWarp||['kaleidoscope','mirror','swirl','pixelate','sketch'].some(id=>effectEnabled(n,id))?null:need;const outputBounds=this.nodeBounds(n,e.progress,aspect,effectNeed,original,parentTime,records);let out;
 if(n.arrange[0]){
  out=this.boundedTarget(w,h,outputBounds,aspect);
  if(n.arrange[0]===14&&n.arrangeExtra.showSource){const src=this.content({kind:'group',children:[n.children[0]],boundary:n.boundary==='repeat'?'visible':n.boundary},e.progress,w,h,palette,aspect,n.boundary==='repeat'?null:out.bounds);out=this.composite(out,src,{op:1,repeat:n.boundary==='repeat'});}
  if(n.kind==='group'&&(['random-child','cycle-child'].includes(n.instanceContent)||[14,16].includes(n.arrange[0]))||n.arrange[0]===15){
   const sw=Math.max(1,Math.ceil(w*Math.max(0,...records.map(r=>r.width))*this.quality)),sh=Math.max(1,Math.ceil(h*Math.max(0,...records.map(r=>r.height))*this.quality));
   for(let i=0;i<records.length;i++){
    const children=instanceChildren(n,i,records[i]);if(n.kind==='group'&&!children.length)continue;
    const r=records[i],phase=shiftedProgress(e.progress,i*n.instancePhase),content={...(n.instancePhase?evaluateNode(original,parentTime,phase).node:n),children};
    const src=this.cachedContent(content,phase,sw,sh,palette,aspect*records[i].width/records[i].height,n.boundary==='repeat'?null:transformBounds(out.bounds,[r.x,r.y,r.width,r.height],[.5,.5,r.turn,r.mirror??1],aspect,true));this.reclaimable.delete(src);
    out=this.composite(out,src,{op:1,box:[r.x,r.y,r.width,r.height],axis:[.5,.5,r.turn,r.mirror??1],repeat:(n.boundary==='repeat'),opacity:r.opacity??1});
   }
  }else if(n.instancePhase){
   for(let i=0;i<records.length;i++){const r=records[i],phase=shiftedProgress(e.progress,i*n.instancePhase),src=this.content(evaluateNode(original,parentTime,phase).node,phase,Math.max(1,Math.ceil(w*r.width*(n.kind==='group'?this.quality:1))),Math.max(1,Math.ceil(h*r.height*(n.kind==='group'?this.quality:1))),palette,aspect*r.width/r.height,n.boundary==='repeat'?null:transformBounds(out.bounds,[r.x,r.y,r.width,r.height],[.5,.5,r.turn,r.mirror??1],aspect,true));out=this.composite(out,src,{op:1,box:[r.x,r.y,r.width,r.height],axis:[.5,.5,r.turn,r.mirror??1],repeat:(n.boundary==='repeat'),opacity:r.opacity??1});this.release(src);}
  }else{const sw=Math.max(1,Math.ceil(w*Math.max(0,...records.map(r=>r.width))*(n.kind==='group'?this.quality:1))),sh=Math.max(1,Math.ceil(h*Math.max(0,...records.map(r=>r.height))*(n.kind==='group'?this.quality:1))),request=n.boundary==='repeat'?null:records.reduce((b,r)=>{const p=recordPlacement(r);return unionBounds(b,transformBounds(out.bounds,p.box,p.axis,aspect,true));},UNIT_BOUNDS),src=this.cachedContent(n,e.progress,sw,sh,palette,records.length?aspect*records[0].width/records[0].height:1,request),table=this.table(records,src.bounds,out.bounds,n.boundary==='repeat',aspect);try{this.pass(out,{source:src,op:4,table:table.texture,count:table.count});}finally{this.gl.deleteTexture(table.texture);this.consumed(src);}}
 }else out=this.content(n,e.progress,w,h,palette,aspect,effectNeed,outputBounds);
 if(n.mask){const t=evaluateNode(n.mask,e.progress).node,[mw,mh]=fitted(t.transform,aspect,1),m=this.renderNode(n.mask,e.progress,w,h,palette,aspect*mw/mh,transformBounds(out.bounds,[t.transform.x,t.transform.y,mw,mh],[t.transform.pivotX,t.transform.pivotY,t.transform.rotation*Math.PI/180,t.transform.mirrorX?-1:1],aspect,true)),placed=this.target(out.w,out.h,false,out.aspect);placed.bounds=out.bounds;this.pass(placed,{source:m,op:1,box:[t.transform.x,t.transform.y,...fitted(t.transform,aspect,1)],axis:[t.transform.pivotX,t.transform.pivotY,t.transform.rotation*Math.PI/180,t.transform.mirrorX?-1:1],opacity:t.opacity});this.consumed(m);const next=this.target(out.w,out.h,false,out.aspect);this.pass(next,{source:out,mask:placed,op:2,inverted:n.maskInvert});this.release(out);this.release(placed);out=next;}
 if(n.color.mode==='remap'){const next=this.target(out.w,out.h,false,out.aspect);this.pass(next,{source:out,op:3,recolor:true,palette});this.release(out);out=next;}
 if(n.invert||n.post.some((v,i)=>v!==[0,1,1,0,1,0,1][i])){const next=this.target(out.w,out.h,false,out.aspect);this.pass(next,{source:out,op:6,post:n.post,inverted:n.invert,palette,recolor:n.color.mode==='remap'||n.kind==='shape'&&!((resources.get(n.type)?.kind==='image'&&n.params[0]<.5&&n.color.mode==='inherit')||(CATALOG.find(p=>p.id===n.type)?.definition.generator&&['inherit','preserve'].includes(n.color.mode)))});this.release(out);out=next;}
 if(hasChannelCurves(n)){const next=this.target(out.w,out.h,false,out.aspect);this.pass(next,{source:out,op:16,curves:n.curves});this.release(out);out=next;}
 if(n.contour?.mode!=='none'&&n.contour?.radius>0){
  const original=out,erode=n.contour.mode==='erode';
  for(const step of contourPasses(n.contour.radius*Math.min(out.w/boundsSize(out.bounds)[0],out.h/boundsSize(out.bounds)[1])/Math.min(out.w,out.h),out.w,out.h)){const next=this.target(out.w,out.h,false,out.aspect);this.pass(next,{source:out,op:7,contourStep:step,inverted:erode,repeat:(n.boundary==='repeat')});if(out!==original)this.release(out);out=next;}
  if(n.contour.mode==='outline'){const next=this.target(out.w,out.h,false,out.aspect);this.pass(next,{source:out,dest:original,op:8});this.release(out);out=next;}
  if(out!==original)this.release(original);
 }
 out=applyPostFx(this,out,n);
 // Cache only finished subtrees; all cached resources remain valid during a draw.
 out.layoutCounts=new Map();walk(original,x=>{if(this.lastCounts.has(x.id))out.layoutCounts.set(x.id,this.lastCounts.get(x.id));});if(!this.streaming)this.cache.set(key,out);return out;
 }
 draw(project,w=512,h=512,{time=0,formulaSeconds=time*(project.output.seconds??1),read=false,solo=null,quality=2,stream=false}={}){
 if(this.gl.isContextLost())throw Error('图形上下文已丢失，请等待恢复或重试');
 const activeImages=new Set();const visit=n=>{if(n.kind==='shape')activeImages.add(n.type);if(n.arrange?.[0]===12){activeImages.add(CATALOG[n.arrange[39]]?.id);for(const k of n.tracks?.['arrange.39']?.keys??[])activeImages.add(CATALOG[k[1]]?.id);}for(const c of n.children??[])visit(c);if(n.mask)visit(n.mask);};visit(project.root);for(const [id,tex]of this.base.assetTextures??[]){if(!activeImages.has(id)){this.gl.deleteTexture(tex);this.base.assetTextures.delete(id);}}
 this.formulaSeconds=formulaSeconds;const start=performance.now();this.quality=quality===1?1:2;this.sampleLimit=Math.min(4096,this.base.maxSize,Math.max(w,h)*2);this.operations=0;this.measureOperations=0;this.measureCache=new Map();if(w*h>16777216)throw Error('输出超过像素预算');
 // Evict between frames, never while ancestors reference cached descendants.
 this.streaming=stream;if(stream)this.clearCache();this.overBlend??=!this.float||!!this.gl.getExtension('EXT_float_blend');
 this.usedKeys.clear();this.reclaimable.clear();this.budget=stream?(project.output.mode==='rgba'&&sanitizeChannelSources(project.output.channelSources).some(Boolean)?768*1024*1024:Infinity):384*1024*1024;
 try{
  let root=canvasRoot(project.root),parentTime=time;if(solo){const entry=find(root,solo);if(entry){root=entry.node.id===project.root.id?canvasRoot(entry.node):entry.node;parentTime=entry.parent?nodeClock(canvasRoot(project.root),entry.parent.id,time).progress:time;}}
  const aspect=project.canvas.ratio,e=evaluateNode(root,parentTime),t=e.node.transform,[rw,rh]=fitted(t,aspect,1),placement=transformPlacement(t,aspect),src=this.renderNode(root,parentTime,w,h,undefined,aspect*rw/rh,transformBounds(UNIT_BOUNDS,placement.box,placement.axis,aspect,true));this.clearStreamSources();const identity=stream&&unitBounds(src.bounds)&&t.x===.5&&t.y===.5&&t.width===1&&t.height===1&&t.pivotX===.5&&t.pivotY===.5&&t.rotation===0&&!t.mirrorX&&e.node.opacity===1,placed=identity?src:this.target(w,h,false,aspect);
  if(!identity){this.pass(placed,{source:src,op:1,box:[t.x,t.y,...fitted(t,aspect,1)],axis:[t.pivotX,t.pivotY,t.rotation*Math.PI/180,t.mirrorX?-1:1],opacity:e.node.opacity});this.consumed(src);}
  const packedSources=new Map(),channelSources=sanitizeChannelSources(project.output.channelSources);
  if(project.output.mode==='rgba')for(const setting of channelSources){
   if(!setting||setting.nodeId===project.root.id||packedSources.has(setting.nodeId))continue;
   const isolated=canvasRoot(project.root),selection=channelSourceSelection(isolated,setting.nodeId);
   if(!selection){packedSources.set(setting.nodeId,null);continue;}
   let progress=time,visible=true,phased=false;for(const ancestor of selection.nodes){
    const e=evaluateNode(ancestor,progress);progress=e.progress;
    const fixedHidden=ancestor.enabled===false&&!(ancestor.animationEnabled!==false&&ancestor.tracks?.enabled&&!ancestor.tracks.enabled.muted);
    visible&&=!fixedHidden&&(phased||e.visible);
    if(e.node.instancePhase&&e.node.arrange[0])phased=true;
   }
   if(!visible){packedSources.set(setting.nodeId,null);continue;}
   this.packSelection=selection;const source=this.renderNode(isolated,time,w,h,undefined,aspect,UNIT_BOUNDS);this.packSelection=null;const target=this.target(w,h,false,aspect);
   this.pass(target,{source,op:1});this.consumed(source);this.clearStreamSources();packedSources.set(setting.nodeId,target);
  }
  const gl=this.gl,p=this.program(true),loc=n=>this.location(p,n);if(!(read&&stream)){if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;}let target=null;if(read)target=this.target(w,h,true,aspect);gl.bindFramebuffer(gl.FRAMEBUFFER,target?.fb??null);gl.drawBuffers(target?[gl.COLOR_ATTACHMENT0]:[gl.BACK]);gl.useProgram(p);gl.viewport(0,0,w,h);
  placed.textures.forEach((tex,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(loc(i?'srcHeight':'srcColor'),i);});const modes=new Int32Array(4);channelSources.forEach((setting,i)=>{const target=setting?.nodeId===project.root.id?placed:packedSources.get(setting?.nodeId);modes[i]=!setting?0:!target?6:({luminance:1,red:2,green:3,blue:4,alpha:5,height:2,colorRed:7,colorGreen:8,colorBlue:9,colorLuminance:10})[setting.component];gl.activeTexture(gl.TEXTURE0+2+i);gl.bindTexture(gl.TEXTURE_2D,target?.textures[setting?.component==='height'?1:0]??placed.textures[0]);gl.uniform1i(loc(['packR','packG','packB','packA'][i]),2+i);});gl.uniform1iv(loc('packModes[0]'),modes);
  gl.uniform1i(loc('outputMode'),['color','height','normal','rgba'].indexOf(project.output.mode));gl.uniform1i(loc('transparent'),+project.output.alpha);gl.uniform1iv(loc('channels'),project.output.channels);gl.uniform3fv(loc('background'),rgb(project.output.background??'#000000'));gl.uniform1f(loc('strength'),project.output.normal);setNormalUniforms(gl,loc,project.output);gl.uniform2f(loc('pixel'),1/w,1/h);gl.drawArrays(gl.TRIANGLES,0,3);
  let pixels=null;if(read){const raw=this.float?new Float32Array(w*h*4):new Uint8Array(w*h*4);gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(0,0,w,h,gl.RGBA,this.float?gl.FLOAT:gl.UNSIGNED_BYTE,raw);if(stream&&this.float){pixels=raw;const row=new Float32Array(w*4);for(let y=0;y<Math.floor(h/2);y++){const a=y*w*4,b=(h-y-1)*w*4;row.set(raw.subarray(a,a+w*4));raw.copyWithin(a,b,b+w*4);raw.set(row,b);}}else{pixels=new Float32Array(raw.length);for(let y=0;y<h;y++)for(let x=0;x<w*4;x++)pixels[y*w*4+x]=raw[(h-y-1)*w*4+x]/(this.float?1:255);}}
  if(gl.getError())throw Error('浏览器或显卡未能完成当前尺寸的输出，请关闭其他图形程序后重试');for(const source of packedSources.values())this.release(source);this.release(target);this.release(placed);this.lastMs=performance.now()-start;return pixels;
 }catch(error){this.clearCache();throw error;}finally{this.packSelection=null;this.clearStreamSources();this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null);for(const [key,t]of this.cache)if(!this.usedKeys.has(key)){this.release(t);this.cache.delete(key);}const cached=new Set(this.cache.values());for(const t of [...this.live])if(!cached.has(t))this.release(t);this.trimPool(128*1024*1024);while(this.allocated>128*1024*1024&&this.cache.size){const key=this.cache.keys().next().value;this.release(this.cache.get(key));this.cache.delete(key);this.trimPool(128*1024*1024);}this.trimPool(128*1024*1024);this.streaming=false;this.budget=384*1024*1024;}
 }
 destroy(){this.base.generators?.destroy();this.footprintCache?.clear();this.layoutCache?.clear();for(const tex of this.base.assetTextures?.values()??[])this.gl.deleteTexture(tex);this.clearCache();for(const t of [...this.live])this.release(t);this.trimPool();this.uniforms.clear();for(const p of this.programs.values())this.gl.deleteProgram(p);for(const p of this.base.programs.values())this.gl.deleteProgram(p.p);}
}
