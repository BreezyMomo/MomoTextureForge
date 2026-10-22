import {messageError,serializeMessageError,restoreMessageError} from './message-catalog.js';
import {BY_ID} from './catalog.js';
import source from './export-worker-source.js';
// One worker per export: terminating it also interrupts synchronous contour fitting.
export function runExportWorker(kind,project,options,{render,stage=()=>{},signal}={}){
 return new Promise((resolve,reject)=>{
  let worker,url,settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;worker?.terminate();if(url)URL.revokeObjectURL(url);signal?.removeEventListener('abort',abort);error?reject(error):resolve(result);};
  const abort=()=>finish(messageError("editor.exportCanceled"));
  if(signal?.aborted){abort();return;}
  try{
   if(source)url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
   // Standalone embeds an IIFE. A classic Blob worker also works from file://,
   // where Chromium can reject a module worker with an opaque origin.
   worker=new Worker(url??new URL('./export-worker.js',import.meta.url),{type:source?'classic':'module'});
   signal?.addEventListener('abort',abort,{once:true});
   worker.onerror=event=>{event.preventDefault();finish(Error(event.message||'后台导出失败，请重试'));};
   worker.onmessageerror=()=>finish(Error('后台导出数据传输失败，请重试'));
   worker.onmessage=async({data})=>{
    if(settled)return;
    if(data.type==='ready'){try{worker.postMessage({type:'start',kind,project,options,definitions:kind.startsWith('encode-')?[]:[...BY_ID]});}catch(error){finish(error);}return;}
    if(data.type==='stage'){stage(data.message);return;}
    if(data.type==='done'){finish(null,data.result);return;}
    if(data.type==='error'){finish(restoreMessageError(data));return;}
    if(data.type==='render')try{
     stage("export.renderingLayers");await new Promise(r=>setTimeout(r,0));if(settled)return;
     const pixels=await render(data.project,data.w,data.h,data.t);
     if(!settled)worker.postMessage({type:'pixels',pixels},[pixels.buffer]);
    }catch(error){if(!settled)worker.postMessage({type:'pixels',error:serializeMessageError(error)});}
   };
  }catch(error){finish(error);}
 });
}
