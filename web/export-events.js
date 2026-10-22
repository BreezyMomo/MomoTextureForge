// A local completion signal. Only the official-site analytics entry subscribes.
export const EXPORT_COMPLETED_EVENT='momo:export-completed';
const FORMATS=new Set(['png','exr','svg','psd','psd-vector','frames','atlas','atlas-exr','batch','batch-atlas']);
const CHANNELS=new Set(['color','height','normal','rgba']);

export function exportEventData(input){
 if(!input||!CHANNELS.has(input.channel))return null;
 if(input.action==='clipboard'&&input.format==='png')return {action:'clipboard',format:'png',channel:input.channel};
 if(input.action==='download'&&FORMATS.has(input.format))return {action:'download',format:input.format,channel:input.channel};
 return null;
}

export function signalExportComplete(input,win=globalThis.window){
 try{
  const detail=exportEventData(input);
  if(!detail||!win?.dispatchEvent)return false;
  win.dispatchEvent(new win.CustomEvent(EXPORT_COMPLETED_EVENT,{detail}));
  return true;
 }catch{return false;}
}
