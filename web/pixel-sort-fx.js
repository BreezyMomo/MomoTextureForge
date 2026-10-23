import {messageError} from './message-catalog.js';
// Sort actual contiguous eligible runs, keeping equal keys in their source order.
// The result is a displacement map: full-resolution color/alpha/height travel together.
export function pixelSortMap(pixels,width,height,values){
 const map=new Float32Array(width*height*4),keys=new Float64Array(width*height),eligible=new Uint8Array(width*height);
 for(let i=0;i<keys.length;i++){
  const at=i*4,a=pixels[at+3],r=a>0?pixels[at]/a:0,g=a>0?pixels[at+1]/a:0,b=a>0?pixels[at+2]/a:0;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  let key=.2126*r+.7152*g+.0722*b;
  if(values.sortBy===1){let hue=delta===0?0:max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4;key=((hue/6)%1+1)%1;}
  if(values.sortBy===2)key=max>0?delta/max:0;
  keys[i]=key;eligible[i]=a>0&&a>=values.alphaThreshold&&key>=values.lowThreshold&&key<=values.highThreshold?1:0;
 }
 const vertical=values.sortAxis===1,lines=vertical?width:height,length=vertical?height:width,span=Math.max(2,Math.round(values.span));
 const index=(line,p)=>vertical?p*width+line:line*width+p;
 for(let line=0;line<lines;line++)for(let start=0;start<length;){
  if(!eligible[index(line,start)]){start++;continue;}
  let end=start+1;while(end<length&&end-start<span&&eligible[index(line,end)])end++;
  const sorted=Array.from({length:end-start},(_,i)=>index(line,start+i));
  sorted.sort((a,b)=>(values.descending?keys[b]-keys[a]:keys[a]-keys[b])||a-b);
  sorted.forEach((from,i)=>{const to=index(line,start+i);map[to*4]=(from%width-to%width)/width;map[to*4+1]=(Math.floor(from/width)-Math.floor(to/width))/height;});
  start=end;
 }
 return map;
}
export function pixelSortSize(source,cellSize,maxSize=4096){
 const [l,b,r,t]=source.bounds,short=Math.min(source.aspect,1),width=Math.max(1,Math.ceil(512*source.aspect/short*(r-l)/cellSize)),height=Math.max(1,Math.ceil(512/short*(t-b)/cellSize));
 if(width*height>1048576||Math.max(width,height)>maxSize)throw messageError('fx.pixelSortBudget');
 return [width,height];
}
export function applyPixelSortFx(renderer,source,values){
 const gl=renderer.gl,[w,h]=pixelSortSize(source,values.cellSize,Math.min(4096,renderer.base.maxSize));
 let analysis,texture,result;const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premultiply=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
 try{
  analysis=renderer.target(w,h,false,source.aspect);renderer.pass(analysis,{source,op:3});gl.bindFramebuffer(gl.FRAMEBUFFER,analysis.fb);gl.readBuffer(gl.COLOR_ATTACHMENT0);
  const raw=renderer.float?new Float32Array(w*h*4):new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,renderer.float?gl.FLOAT:gl.UNSIGNED_BYTE,raw);
  if(gl.getError())throw messageError('fx.pixelSortReadback');
  const map=pixelSortMap(renderer.float?raw:Float32Array.from(raw,v=>v/255),w,h,values);renderer.release(analysis);analysis=null;
  texture=gl.createTexture();gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,w,h,0,gl.RGBA,gl.FLOAT,map);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  result=renderer.target(source.w,source.h,false,source.aspect);renderer.pass(result,{source,op:41,repeat:false,table:texture,fxAmount:values.mix});return result;
 }catch(error){renderer.release(result);throw error;}
 finally{renderer.release(analysis);if(texture)gl.deleteTexture(texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);}
}
