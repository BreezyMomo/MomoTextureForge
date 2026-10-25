import {project,node} from './tree-model.js';
import {messageError} from './message-catalog.js';
import engineShaders from './engine-shader-runtime.js';
import {encodeZIP} from './encoders.js';

// Picker delivery is a reusable module with defaults, independent of the live canvas.
const exporters={sketch:async()=>{
 const source=project(),graphic=node('shape','Circle');source.name='Handdrawn postprocess module';source.root.children=[graphic];graphic.postEffects.sketch.enabled=true;
 const {exportHanddrawnPostprocess}=await import('./handdrawn-postprocess.js');
 const result=await exportHanddrawnPostprocess(source,{nodeId:graphic.id,handdrawnInput:'external',times:[0],size:512});
 return {...result,filename:'Momo-Handdrawn-postprocess-module.zip'};
}};
export const hasPostEffectShader=id=>Object.hasOwn(engineShaders.effects,id)||Object.hasOwn(exporters,id);
export async function exportPostEffectShader(id,{values=null,module:provided=null}={}){
 if(!hasPostEffectShader(id))throw messageError('fx.shaderUnavailable');
 const module=provided??engineShaders.effects[id];if(!module)return exporters[id]();
 const files={...module.files},manifest=JSON.parse(files[module.manifestFile]);
 if(values){const settings=JSON.parse(manifest.settings);for(const p of module.parameters){const value=values[p.key]??p.default;settings[p.key]=p.type==='color'?Object.fromEntries([1,3,5].map((k,i)=>[['x','y','z'][i],parseInt(value.slice(k,k+2),16)/255]).concat([['w',1]])):value;}manifest.settings=JSON.stringify(settings);files[module.manifestFile]=JSON.stringify(manifest,null,2)+'\n';}
 const settings=JSON.parse(manifest.settings);manifest.values=module.parameters.map(p=>({variable:p.key,type:p.type==='color'?'vector':p.type==='boolean'?'boolean':'number',number:p.type==='color'||p.type==='boolean'?0:settings[p.key],boolean:p.type==='boolean'?settings[p.key]:false,vector:p.type==='color'?settings[p.key]:{x:0,y:0,z:0,w:0}}));files[module.manifestFile]=JSON.stringify(manifest,null,2)+'\n';
 const {files:_,...metadata}=module;files['module.json']=JSON.stringify({...metadata,files:Object.keys(module.files)},null,2)+'\n';
 return {bytes:encodeZIP(Object.entries(files).map(([name,text])=>({name,data:new TextEncoder().encode(text)}))),manifest,filename:'Momo-'+id+'-postprocess-module.zip'};
}
