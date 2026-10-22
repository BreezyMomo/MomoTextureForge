import {project,sanitizeTree} from './tree-model.js';
import {serializeLocalProject,restoreLocalProject} from './project-dependencies.js';
import {messageError,serializeMessageError} from './message-catalog.js';
export const GRAPHIC_LIST_KEY='momo-texture-tree:graphic-list:v1';
export const GRAPHIC_LIST_RECOVERY_KEY='momo-texture-tree:graphic-list-recovery:v1';
export function serializeGraphicList(entries){const p=project();p.root.children=[];p.projectResources=entries;return serializeLocalProject(p);}
export const restoreGraphicList=text=>sanitizeTree(restoreLocalProject(JSON.parse(text))).projectResources;
// A retired definition must not prevent unrelated personal resources from loading.
// Back up the exact original text before allowing the active list to be saved.
export function recoverStoredGraphicList(storage,text){
 let entries,rejected=[];
 try{entries=restoreGraphicList(text);}catch(original){
  const raw=JSON.parse(text);sanitizeTree(restoreLocalProject({...raw,projectResources:[]}));
  if(!Array.isArray(raw.projectResources))throw original;
  entries=[];const ids=new Set();
  for(const entry of raw.projectResources){try{
   const [clean]=restoreGraphicList(JSON.stringify({...raw,projectResources:[entry]}));
   if(ids.has(clean.id))throw messageError('ui.invalidOrDuplicateGraphicsListID');
   ids.add(clean.id);entries.push(clean);
  }catch(error){rejected.push({id:entry?.id,name:entry?.name??entry?.root?.name??'',...serializeMessageError(error)});}}
 }
 let backup=storage.getItem(GRAPHIC_LIST_RECOVERY_KEY);
 if(rejected.length){
  const archive=backup?JSON.parse(backup):{schema:'momo.graphic-list-recovery/v1',snapshots:[]};
  if(archive.schema!=='momo.graphic-list-recovery/v1'||!Array.isArray(archive.snapshots))throw messageError('editor.invalidGraphicsRecoveryBackup');
  if(!archive.snapshots.some(snapshot=>snapshot.text===text))archive.snapshots.push({text,rejected});
  backup=JSON.stringify(archive);storage.setItem(GRAPHIC_LIST_RECOVERY_KEY,backup);
 }
 return {entries,rejected,backup};
}
export function canvasProject(p){const {projectResources,...canvas}=p;return {...structuredClone(canvas),projectResources:[]};}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Live works and preview sessions share one shelf; portable projects exclude it.
export class GraphicShelf{
 constructor(entries=[]){this.entries=entries;this.history=new WeakMap();}
 bind(p){Object.defineProperty(p,'projectResources',{enumerable:true,configurable:true,get:()=>this.entries,set:value=>{this.entries=value;}});return p;}
 record(before){if(!equal(before.projectResources,this.entries))this.history.set(before,{expected:structuredClone(this.entries),restore:structuredClone(before.projectResources)});}
 restore(target,current){const change=this.history.get(target);if(change&&equal(this.entries,change.expected)){const previous=structuredClone(this.entries);this.entries=structuredClone(change.restore);this.history.set(current,{expected:structuredClone(this.entries),restore:previous});}return this.bind(target);}
}
