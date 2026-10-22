import {CATALOG,CATEGORIES} from './catalog.js';
import {node} from './tree-model.js';
import {createProjectResource} from './project-resources.js';
import {builtinIdentity} from './graphics-library.js';
import {libraryVisible} from './library-policy.js';

export const GRAPHIC_LIST_DEFAULTS_KEY='momo-texture-tree:graphic-list-defaults:v1';
// Add once. Existing copies (including older versions/personal edits) take
// precedence; the marker allows intentional removals, including an empty list.
export async function withBuiltinGraphics(entries){
 const ids=new Set(entries.map(e=>e.resourceId)),defaults=await Promise.all(CATALOG.filter(p=>!p.id.startsWith('asset_')&&libraryVisible(p.id)).map(async p=>{
  const resourceId=await builtinIdentity(p.id);if(ids.has(resourceId))return null;
  return createProjectResource(node('shape',p.id),{builtin:p.id,resourceId,versionId:p.definition.revision,name:p.definition.name,aliases:p.definition.aliases,category:CATEGORIES[p.category].name,kind:'formula'});
 }));
 return [...entries,...defaults.filter(Boolean)];
}
