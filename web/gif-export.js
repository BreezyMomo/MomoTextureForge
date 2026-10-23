import {gifPlan} from './gif-plan.js';
import {GIFEncoder,quantize,applyPalette} from './vendor/gifenc.js';
import {exportFrameProgress,exportFrameSeconds} from './tree-model.js';
import {messageError} from './message-catalog.js';
import {gifSettings} from './gif-settings.js';
const byte=value=>Math.round(Math.max(0,Math.min(1,Number.isFinite(value)?value:0))*255);
function rgbaBytes(pixels,width,height){
 if(pixels.length!==width*height*4)throw messageError('export.gifInvalidPixels');
 return Uint8Array.from(pixels,byte);
}
const invisible=(rgba,i,settings,alpha)=>alpha&&(rgba[i+3]===0||rgba[i+3]<settings.alphaThreshold);
function makePalette(rgba,settings,alpha){
 // Transparent colors must not consume the opaque palette or contaminate quantization.
 const samples=new Uint8Array(rgba.length);let count=0;
 for(let i=0;i<rgba.length;i+=4)if(!invisible(rgba,i,settings,alpha)){samples.set(rgba.subarray(i,i+4),count);count+=4;}
 return count?quantize(samples.slice(0,count),settings.colors-(alpha?1:0),{format:'rgb565'}):[[0,0,0]];
}
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function indexFrame(rgba,palette,width,settings,alpha){
 let colors=rgba;
 if(settings.dither){
  colors=rgba.slice();
  for(let i=0;i<colors.length;i+=4){const p=i/4,offset=(bayer[((p/width|0)%4)*4+p%width%4]-7.5)*2;
   for(let c=0;c<3;c++)colors[i+c]=Math.max(0,Math.min(255,colors[i+c]+offset));
  }
 }
 const indices=applyPalette(colors,palette,'rgb565');
 if(alpha)for(let p=0;p<indices.length;p++)indices[p]=invisible(rgba,p*4,settings,true)?0:indices[p]+1;
 return indices;
}

// The worker holds only the palette samples, current raw frame and encoded bytes.
// Palette sampling is bounded; full-size frames are never accumulated as RGBA.
export async function exportGIF(project,{render,stage=()=>{}}){
 const output=project.output,{width,height}=output,plan=gifPlan(output),settings=gifSettings(output.gif),alpha=output.alpha!==false;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096)throw messageError('export.gifInvalidSize');
 if(plan.frames>10000)throw messageError('editor.moreThanFramesReduceFPSOrDuration');
 if(width*height*plan.frames>33554432)throw messageError('editor.frameSequenceExceedsTheTotalPixelBudget');
 let palette;
 if(settings.palette==='global'){
  const count=Math.min(12,plan.frames),scale=Math.min(1,128/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale)),samples=new Uint8Array(w*h*4*count);
  for(let i=0;i<count;i++){
   stage({key:'export.gifPaletteProgress',values:[i+1,count]});
   const frame=count===1?0:Math.round(i*(plan.frames-1)/(count-1));
   samples.set(rgbaBytes(await render(project,w,h,exportFrameProgress(plan,frame),exportFrameSeconds(plan,frame)),w,h),i*w*h*4);
  }
  palette=makePalette(samples,settings,alpha);
 }
 const gif=GIFEncoder();
 for(let i=0;i<plan.frames;i++){
  stage({key:'export.gifFrameProgress',values:[i+1,plan.frames]});
  const rgba=rgbaBytes(await render(project,width,height,exportFrameProgress(plan,i),exportFrameSeconds(plan,i)),width,height),colors=palette??makePalette(rgba,settings,alpha);
  gif.writeFrame(indexFrame(rgba,colors,width,settings,alpha),width,height,{
   palette:i===0||!palette?(alpha?[[0,0,0],...colors]:colors):null,
   delay:plan.delays[i],repeat:settings.repeat?0:-1,transparent:alpha,transparentIndex:0,dispose:alpha?2:1
  });
 }
 gif.finish();return {bytes:gif.bytes(),frames:plan.frames,duration:plan.duration};
}
