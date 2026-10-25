import {BY_ID} from './catalog.js';
import {project,node} from './tree-model.js';
import {graphicLabel} from './graphic-label.js';
import {graphicIsAnimated} from './graphic-list-filters.js';
import {hasGraphicShader,graphicAssetShaderProfile} from './project-shader-compiler.js';
import {encodeZIP} from './encoders.js';
import {graphicUnityModule} from './engine-shader-contract.js';
import {readResourcePack,encodeResourcePack} from './resource-pack.js';
import {assetFor} from './resource-assets.js';
import {formulaUsesTime} from './formula-time.js';
import {messageError} from './message-catalog.js';

const singleGraphic=entry=>entry.kind==='formula'&&!entry.forest&&entry.root?.kind==='shape'&&!entry.root.children?.length&&!entry.root.mask;
export const graphicEntryHasShader=entry=>singleGraphic(entry)&&hasGraphicShader(entry.root.type);
export async function exportGraphicShader(graphic,{name=null}={}){
 const asset=graphic.asset??assetFor(graphic.type),module=graphicUnityModule(asset);
 if(!module)throw messageError('graphicShader.unavailable');
 name??=graphicLabel(BY_ID.get(graphic.type)??asset.definition);
 const files={...module.files},manifest=JSON.parse(files['Unity/parameters.json']);
 for(const p of module.parameters){const value=graphic.params?.[p.slot]??asset.definition.defaults[p.slot],property=manifest.materialProperties.find(v=>v.name===p.property);if(!property)throw Error('Missing native Shader parameter: '+p.variable);property.floatValue=value;}
 const source=project(),base=node('shape',BY_ID.has(graphic.type)?graphic.type:'Circle');base.type=graphic.type;base.params=[...(graphic.params??asset.definition.defaults)];base.name=name;source.name=name;source.root.children=[base];
 manifest.nodes=[{nodeId:base.id,resourceId:graphic.type,properties:module.parameters.map(p=>({name:p.property,path:'params.'+p.slot,type:'Float',value:base.params[p.slot]}))}];manifest.support={supported:true,scope:'single-graphic-module'};
 manifest.resourceName=name;manifest.parameters=module.parameters;manifest.verification=module.verification;files['Unity/parameters.json']=JSON.stringify(manifest,null,2)+'\n';
 const {files:_,...metadata}=module;files['module.json']=JSON.stringify({...metadata,files:Object.keys(module.files)},null,2)+'\n';
 const sourceZIP=await encodeResourcePack(source,{assets:[[graphic.type,asset]]});
 return {bytes:encodeZIP([...Object.entries(files).map(([name,text])=>({name,data:new TextEncoder().encode(text)})),{name:'source-project.zip',data:sourceZIP}]),manifest,filename:(asset.definition.id??'graphic')+'-unity-graphic-shader.zip'};
}
// Validate saved resources without registering them or changing editor/catalog state.
export async function graphicBundleCapabilities(bytes,kind){
 const pack=await readResourcePack(bytes);
 try{
  const prepared=new Map(pack.prepared.map(([id,asset])=>[id,asset])),resolve=id=>prepared.get(id)??assetFor(id),entry={...pack.payload,kind};
  const animated=graphicIsAnimated(entry,{usesTime:id=>{const asset=resolve(id);return asset.kind!=='image'&&formulaUsesTime(asset.definition,asset.sources??{},asset.libraries);}});
  const profile=singleGraphic(entry)?graphicAssetShaderProfile(resolve(entry.root.type)):null;
  return {animated,shaderGraphic:profile?{type:profile,params:[...entry.root.params],asset:resolve(entry.root.type)}:null};
 }finally{pack.rollback();}
}
