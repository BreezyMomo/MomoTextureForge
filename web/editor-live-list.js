import {cloneNode,find,sanitizeTree} from './tree-model.js';
import {createProjectResource,renameProjectResource,replaceProjectResource} from './project-resources.js';
import {readResourcePack} from './resource-pack.js';
import {graphicLabel} from './graphic-label.js';

export function createLiveGraphicsList({getProject,getEntries,commit,revision,library,validatePack=()=>{},readPack=readResourcePack}){
 const read=async()=>{const entries=structuredClone(getEntries());return {entries,revision:await revision(JSON.stringify(entries))};};
 return async(operation,args={},isActive=()=>true)=>{
  if(operation==='graphics-list'){
   const state=await read(),q=String(args.query??'').toLowerCase();
   if(args.id){const entry=state.entries.find(e=>e.id===args.id);if(!entry)throw Error('Unknown graphics-list entry');return {revision:state.revision,entry};}
   const entries=state.entries.filter(e=>!q||JSON.stringify([e.name,e.aliases,e.category,e.id]).toLowerCase().includes(q));
   return {revision:state.revision,total:entries.length,entries:entries.map(({root,...meta})=>({...meta,nodeKind:root.kind,graphic:root.kind==='shape'?root.type:null})),scope:'Personal graphics list, independent of library originals and canvas instances.'};
  }
  if(operation!=='graphics-list-edit'||!commit)throw Error('Graphics-list editing is unavailable');
  const beforeProject=JSON.stringify(getProject()),beforeList=JSON.stringify(getEntries());
  if(await revision(beforeProject)!==args.expectedRevision||await revision(beforeList)!==args.expectedListRevision)throw Error('Canvas or graphics list changed; capture and query again');
  const check=()=>{if(!isActive())throw Error('Graphics-list request expired');if(JSON.stringify(getProject())!==beforeProject||JSON.stringify(getEntries())!==beforeList)throw Error('Canvas or graphics list changed; capture and query again');};
  const project=JSON.parse(beforeProject);let entries=JSON.parse(beforeList),pack,applied=false,entryId=null,nodeId=null;
  const getNode=id=>{const n=find(project.root,id==='@root'?project.root.id:id)?.node;if(!n)throw Error('Unknown source/parent node');return n;};
  const getEntry=()=>{const entry=entries.find(e=>e.id===args.entryId);if(!entry)throw Error('Unknown graphics-list entry');return entry;};
  try{
   let imported;
   if(['add-library','insert-library','update-library'].includes(args.action)){
    if(typeof args.libraryKey!=='string')throw Error('libraryKey is required');
    const exported=await library('library-export',{key:args.libraryKey},isActive);check();
    pack=await readPack(Uint8Array.from(atob(exported.zip),c=>c.charCodeAt(0)));check();pack.register();
    if(!pack.payload.root||!pack.payload.graphicResource)throw Error('Expected an official single-resource library pack');
    await validatePack(pack);check();imported={root:pack.payload.root,meta:pack.payload.graphicResource};
   }
   switch(args.action){
    case 'add-library':{
     const existing=entries.find(e=>e.resourceId===imported.meta.resourceId&&e.versionId===imported.meta.versionId);
     if(existing){entryId=existing.id;break;}
     const entry=createProjectResource(imported.root,imported.meta);entries.push(entry);entryId=entry.id;break;
    }
    case 'update-library':{
     const old=getEntry();if(old.resourceId!==imported.meta.resourceId||imported.meta.versionId<=old.versionId)throw Error('Choose a newer version of the same library resource');
     const replacement=createProjectResource(imported.root,imported.meta);replacement.id=old.id;replacement.root.resourceRef=old.id;entries=entries.map(e=>e.id===old.id?replacement:e);entryId=old.id;break;
    }
    case 'rename':{
     const old=getEntry(),entry=renameProjectResource(old,{name:args.name,aliases:args.aliases??old.aliases});entries=entries.map(e=>e.id===old.id?entry:e);entryId=old.id;break;
    }
    case 'remove':{const old=getEntry();entries=entries.filter(e=>e.id!==old.id);entryId=old.id;break;}
    case 'save-node':{
     const original=getNode(args.nodeId),entry=createProjectResource(original,{name:args.name??(original.id===project.root.id?project.name:original.name),aliases:args.aliases});entries.push(entry);original.resourceRef=entry.id;entryId=entry.id;break;
    }
    case 'replace-from-node':{
     const old=getEntry(),entry=replaceProjectResource(old,getNode(args.nodeId));entries=entries.map(e=>e.id===old.id?entry:e);entryId=old.id;break;
    }
    case 'insert-list':case 'insert-library':{
     const entry=args.action==='insert-list'?getEntry():null,root=cloneNode(entry?.root??imported.root),parent=getNode(args.parentId??'@root');
     if(parent.kind!=='group')throw Error('Only a group can contain the inserted resource');
     if(args.index!==undefined&&(!Number.isInteger(args.index)||args.index<0||args.index>parent.children.length))throw Error('Invalid insertion index');
     root.name=args.name??graphicLabel(entry??imported.meta)??root.name;if(!entry)delete root.resourceRef;
     parent.children.splice(args.index??parent.children.length,0,root);nodeId=root.id;entryId=entry?.id??null;break;
    }
    default:throw Error('Unknown graphics-list action');
   }
   check();
   if(JSON.stringify(entries)===beforeList&&JSON.stringify(project)===beforeProject)return {applied:false,entryId,nodeId,editRevision:args.expectedRevision,listRevision:args.expectedListRevision};
   const clean=sanitizeTree({...project,projectResources:entries});
   commit(clean,clean.projectResources,{nodeId,entryId,action:args.action,sourceNodeId:args.nodeId});applied=true;
   const afterProject=JSON.stringify(getProject()),afterList=JSON.stringify(getEntries());
   let persisted=true,persistenceError=null;try{await pack?.persist();}catch(error){persisted=false;persistenceError=error.message;}
   return {applied:true,entryId,nodeId,editRevision:await revision(afterProject),listRevision:await revision(afterList),persisted,persistenceError};
  }finally{if(pack&&!applied)pack.rollback();}
 };
}
