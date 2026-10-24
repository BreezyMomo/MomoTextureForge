import builtinThumbnails from './builtin-thumbnails.js';
import {BY_ID} from './catalog.js';
import {node} from './tree-model.js';
import {assetFor,contentHash,resources} from './resource-assets.js';
import {projectDependencyIds} from './project-dependencies.js';

// Names and instance IDs do not affect rendered pixels or survive duplication.
export const thumbnailVisualKey=value=>JSON.stringify(value,(key,item)=>['id','name','resourceRef'].includes(key)?undefined:item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const defaults=new Map(),dependencies=new Map();
export function builtinThumbnail(entry){
 const id=entry.builtin,spec=BY_ID.get(id);
 if(!spec||entry.root?.kind!=='shape'||entry.root.type!==id||entry.versionId!==spec.definition.revision||!builtinThumbnails[id])return null;
 if(!defaults.has(id))defaults.set(id,thumbnailVisualKey(node('shape',id)));
 return thumbnailVisualKey(entry.root)===defaults.get(id)?builtinThumbnails[id]:null;
}
function dependencyKey(id){
 const source=resources.get(id)??BY_ID.get(id)?.definition,old=dependencies.get(id);
 if(old?.source===source)return old.key;
 const key=contentHash(assetFor(id));dependencies.set(id,{source,key});return key;
}
export async function thumbnailCacheKey(component){
 const root=typeof component==='string'?node('shape',component):component;
 const ids=[...projectDependencyIds({root,projectResources:[]})].sort();
 const inputs=await Promise.all(ids.map(async id=>[id,await dependencyKey(id)]));
 // Render settings and dependency content invalidate old images without tying them to UI language.
 return contentHash(['momo-thumbnail-v1',72,.35,thumbnailVisualKey(root),inputs]);
}
