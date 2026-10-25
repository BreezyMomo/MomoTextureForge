import {project,node} from './tree-model.js';
import {BY_ID} from './catalog.js';
import {graphicLabel} from './graphic-label.js';
import {graphicIsAnimated} from './graphic-list-filters.js';
import {hasGraphicShader,graphicAssetShaderProfile} from './project-shader-compiler.js';
import {exportProjectShader} from './project-shader-package.js';
import {readResourcePack} from './resource-pack.js';
import {assetFor} from './resource-assets.js';
import {formulaUsesTime} from './formula-time.js';
import {messageError} from './message-catalog.js';

const singleGraphic=entry=>entry.kind==='formula'&&!entry.forest&&entry.root?.kind==='shape'&&!entry.root.children?.length&&!entry.root.mask;
export const graphicEntryHasShader=entry=>singleGraphic(entry)&&hasGraphicShader(entry.root.type);
export async function exportGraphicShader(graphic,{name=null}={}){
 if(!hasGraphicShader(graphic.type))throw messageError('graphicShader.unavailable');
 name??=graphicLabel(BY_ID.get(graphic.type));
 const source=project(),base=node('shape',graphic.type);base.params=[...graphic.params];base.name=name;source.name=name;source.root.children=[base];
 const result=await exportProjectShader(source);return {...result,filename:graphic.type+'-unity-graphic-shader.zip'};
}
// Validate saved resources without registering them or changing editor/catalog state.
export async function graphicBundleCapabilities(bytes,kind){
 const pack=await readResourcePack(bytes);
 try{
  const prepared=new Map(pack.prepared.map(([id,asset])=>[id,asset])),resolve=id=>prepared.get(id)??assetFor(id),entry={...pack.payload,kind};
  const animated=graphicIsAnimated(entry,{usesTime:id=>{const asset=resolve(id);return asset.kind!=='image'&&formulaUsesTime(asset.definition,asset.sources??{},asset.libraries);}});
  const profile=singleGraphic(entry)?graphicAssetShaderProfile(resolve(entry.root.type)):null;
  return {animated,shaderGraphic:profile?{type:profile,params:[...entry.root.params]}:null};
 }finally{pack.rollback();}
}
