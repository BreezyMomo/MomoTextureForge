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
  const {exportVectorTask}=await import('./export-vector-task.js');
  const result=await exportVectorTask(data,(project,w,h,t)=>new Promise((resolve,reject)=>{pending={resolve,reject};self.postMessage({type:'render',project,w,h,t});}));
  self.postMessage({type:'done',result},result.bytes?[result.bytes.buffer]:[]);
 }catch(error){self.postMessage({type:'error',...serializeMessageError(error)});}
};
self.postMessage({type:'ready'});
