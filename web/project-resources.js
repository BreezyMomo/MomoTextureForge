import {cloneNode,uid} from './tree-model.js';
export function createProjectResource(root,meta={}){const id=uid(),resourceId=meta.resourceId??uid(),versionId=meta.versionId??1;return {id,resourceId,versionId,personalRevision:0,name:meta.name??root.name,category:meta.category??'图形列表',description:meta.description??'',kind:meta.kind??'composition',source:meta.resourceId?{resourceId,versionId}:null,root:{...cloneNode(root),name:meta.name??root.name,resourceRef:id}};}
export const linkedProjectResource=(entries,root)=>entries.find(entry=>entry.id===root?.resourceRef)??null;
export function renameProjectResource(entry,value){const name=String(value??'').trim();if(!name||name.length>80)throw Error('名称需要1～80个字符');return name===entry.name?entry:{...entry,name,personalRevision:entry.personalRevision+1,root:{...entry.root,name}};}
export function replaceProjectResource(entry,root){return {...entry,personalRevision:entry.personalRevision+1,root:{...cloneNode(root),name:entry.name,resourceRef:entry.id}};}
export function publishedProjectResource(entry,meta,root=entry.root){if(meta.resourceId!==entry.resourceId||meta.versionId<=entry.versionId)throw Error('发布版本与图形列表不匹配');return {...entry,name:meta.name??entry.name,kind:meta.kind??entry.kind,root:{...cloneNode(root),resourceRef:entry.id},versionId:meta.versionId,personalRevision:0,source:{resourceId:meta.resourceId,versionId:meta.versionId}};}

export function libraryResourceStatus(entries,item){
 const matches=entries.filter(e=>e.resourceId===item.resourceId);
 if(matches.some(e=>e.versionId===item.versionId))return 'added';
 if(matches.some(e=>e.versionId<item.versionId))return 'update';
 return 'available';
}
