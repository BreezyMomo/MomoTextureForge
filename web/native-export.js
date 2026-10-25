import {exportFrameProgress,exportFrameSeconds} from './tree-model.js';
import {outputDimensions} from './tree-view.js';
import {TreeRenderer} from './tree-renderer.js';
import {runExportWorker} from './export-job.js';

export const EXPORT_FORMATS=['png','exr','frames','atlas','atlas-exr','batch','batch-atlas','gif','psd','psd-vector','svg'];
// Uses the editor's renderer, encoders, timeline sampling and worker exporters.
export async function exportNativeProject(source,{format='png',seconds=0,threshold=.5,smooth=true,denoise=0,detail=.75}={},stage=()=>{}){
 if(!EXPORT_FORMATS.includes(format)||!Number.isFinite(seconds)||seconds<0)throw Error('Invalid export options');
 const p=structuredClone(source),o=p.output;Object.assign(o,outputDimensions(p.canvas.ratio,o.width));
 const renderer=new TreeRenderer(document.createElement('canvas')),time=seconds/o.seconds;
 let dimensions={width:o.width,height:o.height},frames=1,duration;const files=[];
 const encode=(kind,payload)=>runExportWorker('encode-'+kind,payload,{},{});
 const render=(project,w,h,t,formulaSeconds)=>{
  try{return renderer.draw(project,w,h,{time:t,formulaSeconds,read:true,stream:format==='png'});}
  catch(error){if(format==='png'||!error.message.includes('纹理预算'))throw error;return renderer.draw(project,w,h,{time:t,formulaSeconds,read:true,quality:1});}
 };
 const frame=(w,h,t=time,s=seconds)=>render(p,w,h,t,s);
 async function sequence(w,h,kind){
  if(o.frames>10000)throw Error('Export exceeds 10000 frames');
  const cols=Math.min(o.columns,o.frames),width=w*cols,height=h*Math.ceil(o.frames/cols);
  if(kind!=='frames'&&(width>8192||height>8192||width*height>16777216))throw Error('Atlas exceeds native size budget');
  if(w*h*o.frames>33554432)throw Error('Sequence exceeds native pixel budget');
  frames=o.frames;if(kind!=='frames')dimensions={width,height};
  const atlas=kind==='frames'?null:new Float32Array(width*height*4),entries=[];
  for(let i=0;i<o.frames;i++){
   const pixels=frame(w,h,exportFrameProgress(o,i),exportFrameSeconds(o,i));
   if(atlas){for(let y=0;y<h;y++)atlas.set(pixels.subarray(y*w*4,(y+1)*w*4),((Math.floor(i/cols)*h+y)*width+(i%cols)*w)*4);}
   else entries.push({name:`frame-${String(i).padStart(4,'0')}.png`,data:await encode('png',{pixels,width:w,height:h,depth:o.depth})});
   stage({phase:'frames',completed:i+1,total:o.frames});await new Promise(resolve=>setTimeout(resolve,0));
  }
  return kind==='frames'?encode('zip',{entries}):encode(kind==='exr'?'exr':'png',{pixels:atlas,width,height,depth:o.depth,zip:o.exrZip});
 }
 try{
  stage({phase:'rendering'});
  if((['exr','atlas-exr'].includes(format)||o.depth===16&&!['gif','psd','psd-vector','svg'].includes(format))&&!renderer.float)throw Error('High-precision export requires floating-point rendering support');
  let bytes,extension=format,stats,warnings;
  if(['gif','psd','psd-vector','svg'].includes(format)){
   const result=await runExportWorker(format,p,{time,width:o.width,height:o.height,threshold,smooth,denoise,detail},{stage:message=>stage({phase:'encoding',message}),render:(project,w,h,t,s)=>render(project,w,h,t,s??seconds)});
   bytes=format==='svg'?new TextEncoder().encode(result.svg):result.bytes;extension=format==='psd-vector'?'psd':format;stats=result.stats;warnings=result.warnings;frames=result.frames??1;duration=result.duration;
  }else if(['png','exr'].includes(format))bytes=await encode(format,{pixels:frame(o.width,o.height),width:o.width,height:o.height,depth:o.depth,zip:o.exrZip});
  else if(['batch','batch-atlas'].includes(format)){
   const entries=[];
   for(const size of format==='batch'?[256,512,1024]:[64,128,256]){const ratio=size/Math.max(o.width,o.height),w=Math.max(1,Math.round(o.width*ratio)),h=Math.max(1,Math.round(o.height*ratio));entries.push({name:size+'.png',data:format==='batch'?await encode('png',{pixels:frame(w,h),width:w,height:h,depth:o.depth}):await sequence(w,h,'png')});}
   bytes=await encode('zip',{entries});extension='zip';dimensions={width:null,height:null};files.push(...entries.map(e=>e.name));
  }else{bytes=await sequence(o.width,o.height,format==='frames'?'frames':format==='atlas-exr'?'exr':'png');extension=format==='frames'?'zip':format==='atlas-exr'?'exr':'png';}
  if(bytes.length>64*1024*1024)throw Error('MCP export file exceeds 64 MiB; reduce export dimensions or split the sequence');
  return {bytes,extension,format,...dimensions,frameWidth:o.width,frameHeight:o.height,frames,duration,files,configuredDepth:o.depth,depth:extension==='svg'?null:extension==='exr'?16:['gif','psd'].includes(extension)?8:o.depth,dataType:extension==='svg'?'vector':extension==='exr'?'float16':extension==='gif'?'indexed8':extension==='psd'?'uint8':o.depth===16?'uint16':'uint8',channel:o.mode,seconds,stats,warnings};
 }finally{renderer.destroy();}
}
