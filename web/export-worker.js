import {serializeMessageError,restoreMessageError} from './message-catalog.js';
import {encodePNG,encodeEXR,encodeZIP} from './encoders.js';
let pending;
self.onmessage=async({data})=>{
 if(data.type==='pixels'){if(data.error)pending.reject(restoreMessageError(data.error));else pending.resolve(data.pixels);return;}
 if(data.type!=='start')return;
 try{
  if(data.kind.startsWith('encode-')){
   const {pixels,width,height,depth,zip,entries}=data.project;
   const bytes=await ({'encode-png':()=>encodePNG(pixels,width,height,depth),'encode-exr':()=>encodeEXR(pixels,width,height,zip),'encode-zip':()=>encodeZIP(entries)}[data.kind])();
   self.postMessage({type:'done',result:bytes},[bytes.buffer]);return;
  }
  const render=(project,w,h,t,seconds)=>new Promise((resolve,reject)=>{pending={resolve,reject};self.postMessage({type:'render',project,w,h,t,seconds});});
  const result=data.kind==='gif'
   ?await (await import('./gif-export.js')).exportGIF(data.project,{render,stage:message=>self.postMessage({type:'stage',message})})
   :await (await import('./export-vector-task.js')).exportVectorTask(data,render);
  self.postMessage({type:'done',result},result.bytes?[result.bytes.buffer]:[]);
 }catch(error){self.postMessage({type:'error',...serializeMessageError(error)});}
};
self.postMessage({type:'ready'});
