import {createLiveLibrary} from './editor-live-library.js';
import {cloneNode,find,sanitizeTree} from './tree-model.js';
import {graphicLabel} from './graphic-label.js';
import {graphicVariantKey} from './graphics-identity.js';
import {folderLibrary} from './folder-library.js';

// Compatibility endpoints use the same resources as the sidebar and manager.
// They cannot create a second, independently editable graphics collection.
export function createUnifiedLibraryBridge({store,getProject,commitProject,revision,library=createLiveLibrary(),destination=async()=> (await folderLibrary.binding())?.token??null}){
 const jobs=new Map();
 async function read(){
  await store.refresh();const entries=store.entries(),token=await destination();
  const metadata=entries.map(({root,...entry})=>entry);
  return {entries,token,revision:await revision(JSON.stringify({metadata,token}))};
 }
 async function run(operation,args={},isActive=()=>true){
  const state=await read();
  if(operation==='graphics-list'){
   if(args.id){const entry=await store.materialize(args.id);return {revision:state.revision,entry,scope:'Unified library resource; no separate list copy.'};}
   const q=String(args.query??'').toLowerCase(),entries=state.entries.filter(e=>!q||JSON.stringify([e.name,e.aliases,e.category,e.id]).toLowerCase().includes(q));
   return {revision:state.revision,total:entries.length,entries:entries.map(({root,...entry})=>({...entry,nodeKind:root?.kind??(entry.kind==='composition'?'group':'shape'),graphic:root?.type??entry.builtin??null})),scope:'Unified library: the sidebar and resource manager show these same resources.'};
  }
  const before=JSON.stringify(getProject());
  const check=async()=>{if(!isActive()||JSON.stringify(getProject())!==before||await revision(before)!==args.expectedRevision||(await read()).revision!==args.expectedListRevision)throw Error('Canvas or unified library changed; capture and query again');};
  await check();let entry,item,diskCleanup;
  if(args.libraryKey){const result=await library('library-detail',{key:args.libraryKey},isActive);item=store.items.find(e=>graphicVariantKey(e)===result.item.key);if(!item)throw Error('Unknown library resource');}
  else if(args.entryId)item=store.find(args.entryId);
  if(operation==='graphics-list-edit'){
   if(args.action==='add-library'){if(!item)throw Error('Unknown library resource');return {applied:false,entryId:item.resourceId,listRevision:state.revision,editRevision:args.expectedRevision,scope:'Already in the unified library; no add-to-list operation is needed.'};}
   if(args.action==='update-library')throw Error('There is no separate graphics-list version. Use library update or select a library source/version.');
   if(['insert-list','insert-library'].includes(args.action)){
    if(!item)throw Error('Unknown library resource');entry=await store.materialize(item);await check();
    const project=JSON.parse(before),parent=find(project.root,args.parentId&&args.parentId!=='@root'?args.parentId:project.root.id)?.node;
    if(parent?.kind!=='group')throw Error('Choose a parent group');if(args.index!==undefined&&(!Number.isInteger(args.index)||args.index<0||args.index>parent.children.length))throw Error('Invalid insertion index');
    const root=cloneNode(entry.root);root.name=args.name??graphicLabel(entry);root.resourceRef=entry.id;parent.children.splice(args.index??parent.children.length,0,root);const clean=sanitizeTree(project);await check();commitProject(clean,{resource:root.id});
    return {applied:true,entryId:entry.id,nodeId:root.id,listRevision:state.revision,editRevision:await revision(JSON.stringify(getProject()))};
   }
   if(args.action==='remove'){if(!item)throw Error('Unknown library resource');await check();diskCleanup=await store.delete(item,{expectedDestination:state.token});}
   else if(args.action==='rename'){if(!item)throw Error('Unknown library resource');entry=await store.materialize(item);await check();entry=await store.saveRoot(entry.root,{existing:entry,name:args.name,aliases:args.aliases??entry.aliases,thumbnail:entry.thumbnail,expectedDestination:state.token});}
   else if(['save-node','replace-from-node'].includes(args.action)){
    const project=JSON.parse(before),root=find(project.root,args.nodeId==='@root'?project.root.id:args.nodeId)?.node;if(!root)throw Error('Unknown canvas node');
    if(args.action==='replace-from-node'&&!item)throw Error('Unknown library resource');await check();entry=await store.saveRoot(root,{existing:args.action==='replace-from-node'?item:null,name:args.name??item?.name??root.name,aliases:args.aliases??item?.aliases,expectedDestination:state.token});
   }else throw Error('Unknown unified library action');
   return {applied:true,...(diskCleanup?{diskCleanup}:{}),entryId:entry?.id??item?.resourceId,nodeId:null,listRevision:(await read()).revision,editRevision:await revision(JSON.stringify(getProject())),scope:'Unified library changed; existing canvas instances retain their contents.'};
  }
  if(operation==='graphics-list-batch'){
   if(!Array.isArray(args.keys)||args.keys.length>100||!args.keys.length)throw Error('Choose 1 to 100 library keys');
   if((await library('library-list',{limit:1},isActive)).revision!==args.expectedLibraryRevision)throw Error('Library changed; query again');
   for(const key of args.keys)await library('library-detail',{key},isActive);await check();
   const job={jobId:crypto.randomUUID(),status:'completed',progress:{phase:'complete',done:args.keys.length,total:args.keys.length},result:{added:[],skipped:args.keys,failures:[],canceled:false,scope:'Resources already belong to the unified library; no list copies were created.'}};jobs.set(job.jobId,job);return job;
  }
  throw Error('Unsupported unified library operation');
 }
 return (operation,args={},isActive=()=>true)=>operation==='graphics-list-job'?Promise.resolve(jobs.get(args.jobId)??{status:'failed',error:'Unknown library job'}):run(operation,args,isActive);
}
