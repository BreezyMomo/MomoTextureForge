import rough from './vendor/rough.js';
import {sketchContours} from './sketch-contours.js';
import {messageError} from './message-catalog.js';
const traceCaches=new WeakMap();
function trace(renderer,pixels,width,height,values,source){
 let cache=traceCaches.get(renderer);if(!cache){cache=[];traceCaches.set(renderer,cache);}const key=JSON.stringify([width,height,values.source,values.threshold,values.simplify,source.aspect,source.bounds]);
 const found=cache.find(entry=>entry.key===key&&entry.pixels.length===pixels.length&&entry.pixels.every((v,i)=>v===pixels[i]));if(found)return found.outline;
 const outline=sketchContours(pixels,width,height,{...values,aspect:source.aspect,bounds:source.bounds});cache.push({key,pixels,outline});if(cache.length>2)cache.shift();return outline;
}

export function applySketchFx(renderer,source,values){
 const gl=renderer.gl,[left,bottom,right,top]=source.bounds,bw=right-left,bh=top-bottom;
 // Bounded tracing independent of export size; paths are redrawn at full output resolution.
 const short=Math.min(source.aspect,1),baseWidth=512*source.aspect/short,baseHeight=512/short,shrink=Math.min(.5,768/Math.max(baseWidth*bw,baseHeight*bh)),aw=Math.max(2,Math.ceil(baseWidth*bw*shrink)),ah=Math.max(2,Math.ceil(baseHeight*bh*shrink));
 const width=baseWidth*bw,height=baseHeight*bh,angle=values.hatchAngle*Math.PI/180,sin=Math.abs(Math.sin(angle)),cos=Math.abs(Math.cos(angle)),span=width*sin+height*cos+(values.fillStyle===3?width*cos+height*sin:0);
 if(Math.max(width,height)>16384||values.fillStyle>=2&&values.fillStyle<=3&&span/values.hatchGap*(values.doubleStroke?2:1)>8192)throw messageError('fx.sketchDensity');
 let analysis=null,texture=null,result=null,canvas=null;const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premultiply=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
 try{
  analysis=renderer.target(aw,ah,false,source.aspect);renderer.pass(analysis,{source,op:3});gl.bindFramebuffer(gl.FRAMEBUFFER,analysis.fb);gl.readBuffer(gl.COLOR_ATTACHMENT0);
  const raw=renderer.float?new Float32Array(aw*ah*4):new Uint8Array(aw*ah*4);gl.readPixels(0,0,aw,ah,gl.RGBA,renderer.float?gl.FLOAT:gl.UNSIGNED_BYTE,raw);if(gl.getError())throw messageError('fx.sketchReadback');
  const pixels=renderer.float?raw:Float32Array.from(raw,v=>v/255),outline=trace(renderer,pixels,aw,ah,values,source);renderer.release(analysis);analysis=null;
  canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(source.w,source.h):document.createElement('canvas');canvas.width=source.w;canvas.height=source.h;
  const ctx=canvas.getContext('2d');if(!ctx)throw messageError('fx.sketchCanvas');
  const sx=source.w/(baseWidth*bw),sy=source.h/(baseHeight*bh);ctx.setTransform(sx,0,0,sy,-left*baseWidth*sx,-(1-top)*baseHeight*sy);ctx.lineCap='round';ctx.lineJoin='round';
  if(outline.path){
   const rc=rough.canvas(canvas),options={seed:values.seed,roughness:values.roughness,bowing:values.bowing,stroke:values.strokeColor,strokeWidth:values.strokeWidth,disableMultiStroke:!values.doubleStroke,disableMultiStrokeFill:!values.doubleStroke,fill:values.fillColor,fillWeight:values.hatchWidth,hachureAngle:values.hatchAngle,hachureGap:values.hatchGap};
   if(values.fillStyle>=1&&values.fillStyle<=3){ctx.save();ctx.clip(new Path2D(outline.path),'evenodd');rc.path(outline.path,{...options,stroke:'none',fillStyle:['','solid','hachure','cross-hatch'][values.fillStyle]});ctx.restore();}
   if(values.strokeWidth>0)rc.path(outline.path,{...options,fill:undefined});
  }
  texture=gl.createTexture();gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  result=renderer.target(source.w,source.h,false,source.aspect);renderer.pass(result,{source,op:31,table:texture,fxData:[values.fillStyle]});return result;
 }catch(error){renderer.release(result);throw error;}
 finally{renderer.release(analysis);if(texture)gl.deleteTexture(texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);if(canvas){canvas.width=1;canvas.height=1;}}
}
