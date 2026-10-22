import {BY_ID} from './catalog.js';
import {exportContourSVG} from './contour-svg.js';
import {exportContourPSD} from './tree-psd-contours.js';
import {exportPSD} from './tree-psd.js';
export async function exportVectorTask(data,render){
 for(const [id,definition] of data.definitions??[])BY_ID.set(id,definition);
 const result=await ({svg:exportContourSVG,'psd-vector':exportContourPSD,psd:exportPSD}[data.kind])(data.project,{
  ...data.options,render,
  stage:message=>self.postMessage({type:'stage',message}),
  progress:(i,total)=>self.postMessage({type:'stage',message:{key:'export.processedLayers',values:[i,total]}})
 });
 delete result.imageData;
 return result;
}
