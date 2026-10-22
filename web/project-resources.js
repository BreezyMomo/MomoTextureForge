import {graphicAliasesField} from './graphic-name.js';
import {messageError} from './message-catalog.js';
import {cloneNode,uid} from './tree-model.js';
export function createProjectResource(root,meta={}){const id=uid(),resourceId=meta.resourceId??uid(),versionId=meta.versionId??1;return {id,resourceId,versionId,personalRevision:0,name:meta.name??root.name,...graphicAliasesField(meta.aliases),...(meta.builtin?{builtin:meta.builtin}:{}),category:meta.category??'图形列表',description:meta.description??'',kind:meta.kind??'composition',source:meta.resourceId?{resourceId,versionId}:null,root:{...cloneNode(root),name:meta.name??root.name,resourceRef:id}};}
export const linkedProjectResource=(entries,root)=>entries.find(entry=>entry.id===root?.resourceRef)??null;
export function renameProjectResource(entry,value){const metadata=typeof value==='object'&&value!==null?value:{name:value,...graphicAliasesField(entry.aliases)},name=String(metadata.name??'').trim(),aliases=graphicAliasesField(metadata.aliases);if(!name||name.length>80)throw messageError("library.nameMustContainCharacters");return name===entry.name&&JSON.stringify(aliases.aliases)===JSON.stringify(entry.aliases)?entry:{...entry,aliases:undefined,...aliases,name,personalRevision:entry.personalRevision+1,root:{...entry.root,name}};}
export function replaceProjectResource(entry,root){return {...entry,personalRevision:entry.personalRevision+1,root:{...cloneNode(root),name:entry.name,resourceRef:entry.id}};}
export function publishedProjectResource(entry,meta,root=entry.root){if(meta.resourceId!==entry.resourceId||meta.versionId<=entry.versionId)throw Error('发布版本与图形列表不匹配');return {...entry,name:meta.name??entry.name,...graphicAliasesField(meta.aliases??entry.aliases),kind:meta.kind??entry.kind,root:{...cloneNode(root),resourceRef:entry.id},versionId:meta.versionId,personalRevision:0,source:{resourceId:meta.resourceId,versionId:meta.versionId}};}

export function libraryResourceStatus(entries,item){
 const matches=entries.filter(e=>e.resourceId===item.resourceId);
 if(matches.some(e=>e.versionId===item.versionId))return 'added';
 if(matches.some(e=>e.versionId<item.versionId))return 'update';
 return 'available';
}
