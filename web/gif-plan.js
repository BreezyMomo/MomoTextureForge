import {exportFrameCount,exportDuration} from './tree-model.js';
// Browsers commonly replace GIF delays below 20 ms with much slower defaults.
// Quantize cumulative boundaries, rather than each interval, to avoid 30 FPS drift.
export function gifPlan(output){
 const fps=Math.max(1,Math.min(50,Number(output.fps)||30)),seconds=Math.max(.05,Math.min(600,Number(output.seconds)||3));
 const timing={fps,seconds,exportSeconds:Math.max(.05,Math.min(600,exportDuration(output))),loopExport:output.loopExport!==false},frames=exportFrameCount(timing);
 const delays=Array.from({length:frames},(_,i)=>(Math.round((i+1)*100/fps)-Math.round(i*100/fps))*10);
 return {...timing,frames,delays,duration:Math.round(frames*100/fps)/100};
}
