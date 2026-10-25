import {addLibrarySelection} from './library-batch.js';
import {createProjectResource,libraryResourceStatus} from './project-resources.js';
import {readResourcePack} from './resource-pack.js';
import {sanitizeTree} from './tree-model.js';

// Native batch semantics: cancellation saves the completed prefix in one undo
// step. Expiry or a concurrent edit instead rejects the entire uncommitted batch.
export function createLiveListBatch({getProject,getEntries,commit,revision,library,validatePack=()=>{},readPack=readResourcePack,yieldControl}){
 const jobs=new Map();let tail=Promise.resolve();
 const view=job=>{const {controller,...publicState}=job;return structuredClone(publicState);};
 return async(operation,args={},isActive=()=>true)=>{
  if(operation==='graphics-list-job'){
   const job=jobs.get(args.jobId);if(!job)throw Error('Unknown graphics-list batch');
   if(args.action==='cancel'&&['queued','running'].includes(job.status)&&job.progress.phase!=='saving'){job.controller.abort();job.status='canceling';}
   return view(job);
  }
  if(operation!=='graphics-list-batch'||!commit)throw Error('Batch editing unavailable');
  if(!Array.isArray(args.keys)||!args.keys.length||args.keys.length>100||new Set(args.keys).size!==args.keys.length)throw Error('Choose 1 to 100 unique library keys');
  if([...jobs.values()].filter(j=>['queued','running','canceling'].includes(j.status)).length>=4)throw Error('At most four pending graphics-list batches');
  const beforeProject=JSON.stringify(getProject()),beforeList=JSON.stringify(getEntries());
  if(await revision(beforeProject)!==args.expectedRevision||await revision(beforeList)!==args.expectedListRevision)throw Error('Canvas or graphics list changed; capture and query again');
  if([...jobs.values()].filter(j=>['queued','running','canceling'].includes(j.status)).length>=4)throw Error('At most four pending graphics-list batches');
  const job={jobId:crypto.randomUUID(),status:'queued',progress:{phase:'queued',done:0,total:args.keys.length,ready:0,skipped:0,failed:0},controller:new AbortController()};jobs.set(job.jobId,job);
  while(jobs.size>32){const old=[...jobs.values()].find(j=>!['queued','running','canceling'].includes(j.status));if(!old)break;jobs.delete(old.jobId);}
  const work=async()=>{
   const check=()=>{if(!isActive())throw Error('Batch request expired');if(JSON.stringify(getProject())!==beforeProject||JSON.stringify(getEntries())!==beforeList)throw Error('Canvas or graphics list changed; capture and query again');};
   const checkLibrary=async()=>{if((await library('library-list',{limit:1},isActive)).revision!==args.expectedLibraryRevision)throw Error('Library changed; query again');check();};
   if(job.controller.signal.aborted){job.status='canceled';job.result={added:[],skipped:[],failures:[],canceled:true,done:0,total:args.keys.length};return;}
   check();await checkLibrary();job.status='running';const entries=JSON.parse(beforeList),preparedEntries=[],persistenceErrors=[];let committed=false;
   const timer=setInterval(()=>{if(!isActive())job.controller.abort();},50);
   try{
    const items=[];for(const key of args.keys){check();if(job.controller.signal.aborted)break;const detail=await library('library-detail',{key},isActive);if(detail.revision!==args.expectedLibraryRevision)throw Error('Library changed; query again');items.push(detail.item);}
    const result=await addLibrarySelection({items,status:item=>libraryResourceStatus([...entries,...preparedEntries],item),signal:job.controller.signal,yieldControl,
     onProgress:progress=>{job.progress={...progress,item:progress.item?.key??null};},
     prepare:async(item,signal)=>{
      let pack;try{
       check();const exported=await library('library-export',{key:item.key},isActive);check();
       pack=await readPack(Uint8Array.from(atob(exported.zip),c=>c.charCodeAt(0)));check();if(signal.aborted)throw Error('Batch canceled');pack.register();await validatePack(pack);check();if(signal.aborted)throw Error('Batch canceled');
       if(!pack.payload.root||!pack.payload.graphicResource)throw Error('Expected a single-resource library pack');
       const entry=createProjectResource(pack.payload.root,pack.payload.graphicResource);preparedEntries.push(entry);return {entry,pack,rollback:()=>pack.rollback()};
      }catch(error){pack?.rollback();throw error;}
     },
     commit:async prepared=>{
      await checkLibrary();const ready=prepared.filter(p=>p.entry);if(!ready.length)return;
      const project=sanitizeTree({...JSON.parse(beforeProject),projectResources:[...entries,...ready.map(p=>p.entry)]});check();
      commit(project,project.projectResources,{action:'batch-add'});committed=true;
      for(const entry of ready)try{await entry.pack.persist();}catch(error){persistenceErrors.push({key:entry.item.key,error:error.message});}
     }
    });
    if(!committed)check();
    job.result={...result,total:args.keys.length,added:result.added.filter(item=>preparedEntries.some(e=>e.resourceId===item.resourceId&&e.versionId===item.versionId)).map(item=>item.key),entryIds:preparedEntries.map(e=>e.id),skipped:result.skipped.map(item=>item.key),failures:result.failures.map(f=>({key:f.item.key,needsUpdate:!!f.needsUpdate,error:f.error?.message??'A newer version requires explicit update'})),persistenceErrors,editRevision:await revision(JSON.stringify(getProject())),listRevision:await revision(JSON.stringify(getEntries()))};
    job.status=result.canceled?'canceled':'completed';
   }finally{clearInterval(timer);}
  };
  const pending=tail.then(work);tail=pending.catch(()=>{});pending.catch(error=>{job.status='failed';job.error=error.message;});return view(job);
 };
}
