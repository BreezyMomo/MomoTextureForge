import {project,node} from './tree-model.js';
import {messageError} from './message-catalog.js';

// Picker delivery is a reusable module with defaults, independent of the live canvas.
const exporters={sketch:async()=>{
 const source=project(),graphic=node('shape','Circle');source.name='Handdrawn postprocess module';source.root.children=[graphic];graphic.postEffects.sketch.enabled=true;
 const {exportHanddrawnPostprocess}=await import('./handdrawn-postprocess.js');
 const result=await exportHanddrawnPostprocess(source,{nodeId:graphic.id,handdrawnInput:'external',times:[0],size:512});
 return {...result,filename:'Momo-Handdrawn-postprocess-module.zip'};
}};
export const hasPostEffectShader=id=>Object.hasOwn(exporters,id);
export async function exportPostEffectShader(id){if(!hasPostEffectShader(id))throw messageError('fx.shaderUnavailable');return exporters[id]();}
