import {messageError} from './message-catalog.js';
// Source bytes remain immutable; these settings are part of the asset content hash.
export function validateImageProcessing(settings) {
 if(settings===undefined)return;
 if(!settings||settings.version!==1||!['none','color','black','extract'].includes(settings.mode)||!/^#[0-9a-f]{6}$/i.test(settings.color)||typeof settings.connected!=='boolean')throw Error('图片背景处理设置无效');
 if(settings.autoCenter!==undefined&&typeof settings.autoCenter!=='boolean')throw Error('图像居中设置无效');
 if(settings.contour!==undefined){const c=settings.contour;if(!c||typeof c.enabled!=='boolean'||!Number.isFinite(c.threshold)||c.threshold<0||c.threshold>1||!Number.isFinite(c.softness)||c.softness<0||c.softness>1)throw Error('轮廓重建设置无效');}
 for(const key of ['tolerance','softness'])if(!Number.isFinite(settings[key])||settings[key]<0||settings[key]>1)throw Error('图片背景处理范围无效');
}
export const defaultImageProcessing=()=>({version:1,mode:'none',color:'#ffffff',tolerance:.08,softness:.12,connected:true});
export function removeImageBackground(data,width,height,settings) {
 validateImageProcessing(settings);
 const result=new Uint8ClampedArray(data);
 if(!settings||settings.mode==='none')return result;
 if(data.length!==width*height*4)throw Error('图片像素尺寸不匹配');
 const bg=settings.mode==='black'?[0,0,0]:[1,3,5].map(i=>parseInt(settings.color.slice(i,i+2),16)/255);
 const count=width*height,amount=new Float32Array(count);
 for(let i=0;i<count;i++){
  const k=i*4,dist=Math.max(Math.abs(data[k]/255-bg[0]),Math.abs(data[k+1]/255-bg[1]),Math.abs(data[k+2]/255-bg[2]));
  // Alpha extraction keeps black-backed additive effects visually stable on black.
  let alpha=settings.mode==='black'?Math.max(0,(dist-settings.tolerance)/(1-settings.tolerance||1)):settings.softness===0?(dist>settings.tolerance?1:0):Math.min(1,Math.max(0,(dist-settings.tolerance)/settings.softness));
  if(settings.mode==='black'&&settings.softness>0){const t=Math.min(1,Math.max(0,(dist-settings.tolerance)/settings.softness));alpha*=t*t*(3-2*t);}
  amount[i]=settings.mode==='extract'?1-alpha:alpha;
 }
 let reached;
 if(settings.mode==='color'&&settings.connected){
  reached=new Uint8Array(count);const queue=new Uint32Array(count);let head=0,tail=0;
  const add=i=>{if(!reached[i]&&(amount[i]<1||data[i*4+3]===0)){reached[i]=1;queue[tail++]=i;}};
  for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
  while(head<tail){const i=queue[head++],x=i%width;if(x)add(i-1);if(x+1<width)add(i+1);if(i>=width)add(i-width);if(i+width<count)add(i+width);}
 }
 for(let i=0;i<count;i++){
  if(reached&&!reached[i])continue;
  const k=i*4,alpha=amount[i];result[k+3]=data[k+3]*alpha;
  // Foreground selection preserves source RGB; it is not background unmatting.
  if(settings.mode==='extract'){if(result[k+3]===0)result[k]=result[k+1]=result[k+2]=0;continue;}
  for(let c=0;c<3;c++)result[k+c]=alpha>0?(data[k+c]/255-bg[c]*(1-alpha))/alpha*255:0;
 }
 return result;
}
// Translate whole pixels only, preserving every nontransparent source pixel exactly.
export function centerImagePixels(data,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||data.length!==width*height*4)throw Error('图片像素尺寸不匹配');
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const result=new Uint8ClampedArray(data.length);
 if(right<0)return {data:result,offsetX:0,offsetY:0,bounds:null};
 const offsetX=Math.round((width-1-left-right)/2),offsetY=Math.round((height-1-top-bottom)/2);
 for(let y=top;y<=bottom;y++){
  const start=(y*width+left)*4,end=(y*width+right+1)*4;
  result.set(data.subarray(start,end),((y+offsetY)*width+left+offsetX)*4);
 }
 return {data:result,offsetX,offsetY,bounds:{left,top,right,bottom}};
}
export async function prepareImageBitmap(asset) {
 const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
 const bitmap=await createImageBitmap(new Blob([bytes],{type:asset.mime}),{premultiplyAlpha:'none',imageOrientation:'flipY'});
 if(bitmap.width>4096||bitmap.height>4096||bitmap.width*bitmap.height>16777216){bitmap.close();throw messageError("library.maximumImageSizeIs");}
 if(!asset.imageProcessing||(asset.imageProcessing.mode==='none'&&!asset.imageProcessing.autoCenter))return bitmap;
 try {
  const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);pixels.data.set(removeImageBackground(pixels.data,canvas.width,canvas.height,asset.imageProcessing));if(asset.imageProcessing.autoCenter)pixels.data.set(centerImagePixels(pixels.data,canvas.width,canvas.height).data);ctx.putImageData(pixels,0,0);
  return await createImageBitmap(canvas,{premultiplyAlpha:'none'});
 }finally{bitmap.close();}
}

// Reconstruct after texture filtering: thresholding source pixels alone still blurs on enlargement.
export function validateImageTransform(transform){
 if(transform===undefined)return;
 if(!transform||!Number.isFinite(transform.scale)||transform.scale<.1||transform.scale>4||!Number.isFinite(transform.rotation)||transform.rotation< -180||transform.rotation>180)throw Error('图片缩放或旋转范围无效');
}
export function validateImageColor(color){
 if(color===undefined)return;
 if(!color||!['none','tint','replace'].includes(color.mode)||!/^#[0-9a-f]{6}$/i.test(color.source)||!/^#[0-9a-f]{6}$/i.test(color.target)||typeof color.preserveAlpha!=='boolean'||![color.tolerance,color.softness].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('图片颜色处理设置无效');
}
export function imageColorGLSL(color){
 validateImageColor(color);if(!color||color.mode==='none')return '';
 const rgb=hex=>'vec3('+[1,3,5].map(i=>(parseInt(hex.slice(i,i+2),16)/255).toFixed(8)).join(',')+')';
 const weight=color.mode==='tint'?'1.':`(1.-smoothstep(${color.tolerance.toFixed(8)},${Math.min(1.000001,color.tolerance+Math.max(color.softness,.000001)).toFixed(8)},distanceColor))`;
 return `if(v.a>0.){vec3 delta=abs(v.rgb-${rgb(color.source)});float distanceColor=max(delta.r,max(delta.g,delta.b));float replaceWeight=${weight};v.rgb=mix(v.rgb,${rgb(color.target)},replaceWeight);${color.preserveAlpha?'':'v.a=mix(v.a,1.,replaceWeight);'}}`;
}
export function imageSamplingGLSL(settings,transform,color){
 validateImageTransform(transform);
 validateImageProcessing(settings);
 const c=settings?.contour;
 const contour=c?.enabled?`float width=max(${c.softness.toFixed(6)},max(fwidth(v.a),.00001));float a=smoothstep(${c.threshold.toFixed(6)}-width*.5,${c.threshold.toFixed(6)}+width*.5,v.a);v.a=v.a<=0.?0.:(v.a>=1.?1.:a);`:'';
 const angle=(transform?.rotation??0)*Math.PI/180,scale=transform?.scale??1;
 const mapping=transform?`vec2 sz=vec2(textureSize(assetImage,0));vec2 aspect=sz/max(sz.x,sz.y);vec2 q=(p-.5)*aspect/${scale.toFixed(8)};q=mat2(${Math.cos(angle).toFixed(8)},${Math.sin(angle).toFixed(8)},${(-Math.sin(angle)).toFixed(8)},${Math.cos(angle).toFixed(8)})*q;p=q/aspect+.5;`:'';
 return `vec4 sampleAssetImage(vec2 p){${mapping}vec4 v=texture(assetImage,p);v*=float(all(greaterThanEqual(p,vec2(0)))&&all(lessThanEqual(p,vec2(1))));${contour}${imageColorGLSL(color)}return v;}`;
}
