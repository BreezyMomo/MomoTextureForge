import {messageError} from './message-catalog.js';
// Display names and adjustable defaults do not identify algorithms. Hidden ABI values do.
export const ENGINE_SHADER_SCHEMA='momo.engine-shader/v1';
const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export function graphicShaderSignature(asset){
 const d=asset.definition;
 return stable({kind:asset.kind,scalar:d.outputs.scalar,generator:d.generator,parameters:d.parameters.map(p=>[p.variable,p.slot,p.type??'number',p.min,p.max,p.step,p.role??null,p.options?.map(o=>o.value??o)??null]),hiddenDefaults:d.defaults.map((value,slot)=>d.parameters.some(p=>p.slot===slot)?null:value),libraries:asset.libraries});
}
export function validateEngineShader(module){
 if(!module||module.schema!==ENGINE_SHADER_SCHEMA||!['graphic','postprocess'].includes(module.kind)||module.target?.engine!=='Unity'||module.target?.pipeline!=='URP'||typeof module.sourceSignature!=='string'||!module.sourceSignature||typeof module.id!=='string'||!Array.isArray(module.parameters)||!module.files||typeof module.files!=='object')throw messageError('shader.invalidModule');
 const files=Object.entries(module.files);let length=0;
 if(!files.length||files.length>64)throw messageError('shader.invalidModule');
 for(const [name,text]of files){if(!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(name)||name.split('/').some(p=>!p||p==='..'||p==='.')||typeof text!=='string'||(length+=text.length)>4*1024*1024)throw messageError('shader.invalidModule');}
 if(!module.files[module.shaderFile]||!module.files[module.hlslFile]||module.kind==='graphic'&&!module.files['Unity/parameters.json'])throw messageError('shader.invalidModule');
 const variables=new Set(),properties=new Set();
 for(const p of module.parameters){if(typeof p.variable!=='string'||!p.variable||variables.has(p.variable)||typeof p.property!=='string'||!/^[_A-Za-z][_A-Za-z0-9]*$/.test(p.property)||properties.has(p.property))throw messageError('shader.invalidModule');variables.add(p.variable);properties.add(p.property);}
 return module;
}
export function graphicUnityModule(asset){
 const module=asset?.engineShaders?.unity;
 if(!module||module.kind!=='graphic'||module.sourceSignature!==graphicShaderSignature(asset)||module.verification?.engineCompilation==='failed'||module.verification?.engineVisualReview==='failed')return null;
 try{validateEngineShader(module);const specs=asset.definition.parameters;if(specs.length!==module.parameters.length||specs.some(p=>!module.parameters.some(m=>m.variable===p.variable&&m.slot===p.slot)))return null;const manifest=JSON.parse(module.files['Unity/parameters.json']);if(!Array.isArray(manifest.materialProperties)||module.parameters.some(p=>!manifest.materialProperties.some(v=>v.name===p.property&&v.type==='Float'&&Number.isFinite(v.floatValue))))return null;return module;}catch{return null;}
}
// Only callers that preserve the algorithm may rebind a serialization/ABI wrapper.
export function rebindGraphicModule(asset,nextAsset){
 const module=graphicUnityModule(asset);if(!module)return null;
 const specs=nextAsset.definition.parameters;
 if(specs.length!==module.parameters.length||module.parameters.some(p=>!specs.some(s=>s.variable===p.variable&&s.min===p.min&&s.max===p.max&&s.step===p.step&&(s.type??'number')===(p.type??'number'))))return null;
 const next=structuredClone(module);next.parameters=next.parameters.map(p=>({...p,slot:specs.find(s=>s.variable===p.variable).slot}));next.sourceSignature=graphicShaderSignature(nextAsset);return {unity:next};
}
