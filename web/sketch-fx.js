import rough from './vendor/rough.js';
import {createSketchContourTracer} from './sketch-contours.js';
import {messageError} from './message-catalog.js';
import {SKETCH_FILL_STYLES,sketchOptions,sketchWorkEstimate,sunburstPath} from './sketch-options.js';
const traceCaches=new WeakMap();
function trace(renderer,pixels,width,height,values,source){
 let tracer=traceCaches.get(renderer);if(!tracer){tracer=createSketchContourTracer();traceCaches.set(renderer,tracer);}
 return tracer(pixels,width,height,values,{aspect:source.aspect,bounds:source.bounds});
}

export function applySketchFx(renderer,source,values,{strokeOnly=false,fillOnly=false}={}){
 const gl=renderer.gl,[left,bottom,right,top]=source.bounds,bw=right-left,bh=top-bottom;
 // Bounded tracing independent of export size; paths are redrawn at full output resolution.
 const short=Math.min(source.aspect,1),baseWidth=512*source.aspect/short,baseHeight=512/short,shrink=Math.min(.5,768/Math.max(baseWidth*bw,baseHeight*bh)),aw=Math.max(2,Math.ceil(baseWidth*bw*shrink)),ah=Math.max(2,Math.ceil(baseHeight*bh*shrink));
 const width=baseWidth*bw,height=baseHeight*bh;
 if(Math.max(width,height)>16384||sketchWorkEstimate(values,width,height)>200000)throw messageError('fx.sketchDensity');
 let analysis=null,texture=null,result=null,canvas=null;const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premultiply=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
 try{
  analysis=renderer.target(aw,ah,false,source.aspect);renderer.pass(analysis,{source,op:3});gl.bindFramebuffer(gl.FRAMEBUFFER,analysis.fb);gl.readBuffer(gl.COLOR_ATTACHMENT0);
  const raw=renderer.float?new Float32Array(aw*ah*4):new Uint8Array(aw*ah*4);gl.readPixels(0,0,aw,ah,gl.RGBA,renderer.float?gl.FLOAT:gl.UNSIGNED_BYTE,raw);if(gl.getError())throw messageError('fx.sketchReadback');
  const pixels=renderer.float?raw:Float32Array.from(raw,v=>v/255),outline=trace(renderer,pixels,aw,ah,values,source);renderer.release(analysis);analysis=null;
  canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(source.w,source.h):document.createElement('canvas');canvas.width=source.w;canvas.height=source.h;
  const ctx=canvas.getContext('2d');if(!ctx)throw messageError('fx.sketchCanvas');
  const sx=source.w/(baseWidth*bw),sy=source.h/(baseHeight*bh);ctx.setTransform(sx,0,0,sy,-left*baseWidth*sx,-(1-top)*baseHeight*sy);ctx.lineCap='round';ctx.lineJoin='round';
  if(outline.path){
   const rc=rough.canvas(canvas),options=sketchOptions(values);
   if(fillOnly){ctx.fillStyle='#ffffff';ctx.fill(new Path2D(outline.path),'evenodd');}
   if(!strokeOnly&&!fillOnly&&values.fillStyle!==0&&values.fillStyle!==4){
    ctx.save();ctx.clip(new Path2D(outline.path),'evenodd');
    if(values.fillStyle===9)rc.path(sunburstPath(values,baseWidth,baseHeight),{...options,stroke:options.fill,strokeWidth:values.hatchWidth,strokeLineDash:options.fillLineDash,strokeLineDashOffset:options.fillLineDashOffset,disableMultiStroke:options.disableMultiStrokeFill,fill:undefined});
    else rc.path(outline.path,{...options,stroke:'none',fillStyle:SKETCH_FILL_STYLES[values.fillStyle]});
    ctx.restore();
   }
   // Export coverage at the original opacity, preserving overlap between Rough.js strokes.
   if(!fillOnly&&values.strokeWidth>0)rc.path(outline.path,{...sketchOptions(strokeOnly?{...values,strokeColor:'#ffffff'}:values,'stroke'),fill:undefined});
  }
  texture=gl.createTexture();gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  result=renderer.target(source.w,source.h,false,source.aspect);renderer.pass(result,{source,op:31,table:texture,fxData:[strokeOnly||fillOnly?4:values.fillStyle]});return result;
 }catch(error){renderer.release(result);throw error;}
 finally{renderer.release(analysis);if(texture)gl.deleteTexture(texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);if(canvas){canvas.width=1;canvas.height=1;}}
}
