import * as native from './remote-library.js';

export function createLiveRemote({revision,api=native}){
 const raw=async()=>{const [sources,catalogs,downloads]=await Promise.all([api.remoteSources(),api.remoteCatalogs(),api.remoteDownloads()]);return {sources,catalogs,downloads};};
 const describe=async state=>({revision:await revision(JSON.stringify(state)),sources:state.sources,catalogs:state.catalogs.map(({entries,...meta})=>({...meta,count:entries.length})),downloads:state.downloads.map(({thumbnail,...meta})=>meta),scope:'Browser subscriptions and downloaded cache only; canvas, list copies and local originals are unchanged.'});
 let tail=Promise.resolve();const jobs=new Map();
 const publicJob=job=>{const {canceled,...state}=job;return structuredClone(state);};
 const run=(operation,args,isActive)=>{
  if(operation==='remote-job'){
   const job=jobs.get(args.jobId);if(!job)throw Error('Unknown remote job');
   if(args.action==='cancel'&&['queued','running'].includes(job.status)){job.canceled=true;job.status='canceled';}
   return Promise.resolve(publicJob(job));
  }
  if(operation==='remote-edit'&&args.background){
   if(!['refresh','download'].includes(args.action))throw Error('Background jobs support refresh and download');
   if([...jobs.values()].filter(j=>['queued','running'].includes(j.status)).length>=4)throw Error('At most four pending remote jobs');
   const job={jobId:crypto.randomUUID(),status:'queued',action:args.action,sourceId:args.sourceId,resourceId:args.resourceId??null,canceled:false};jobs.set(job.jobId,job);
   while(jobs.size>32){const old=[...jobs.values()].find(j=>!['queued','running'].includes(j.status));if(!old)break;jobs.delete(old.jobId);}
   run('remote-edit',{...args,background:false,_job:job},()=>!job.canceled&&isActive()).then(result=>{if(!job.canceled){job.status='completed';job.result=result;}},error=>{if(!job.canceled){job.status='failed';job.error=error.message;}});
   return Promise.resolve(publicJob(job));
  }
  const work=async()=>{
   const state=await raw();if(operation==='remote-state')return describe(state);
   if(operation!=='remote-edit'||await revision(JSON.stringify(state))!==args.expectedRemoteRevision)throw Error('Remote library changed; query again');
   if(!isActive())throw Error('Remote request expired');if(args._job)args._job.status='running';
   const source=state.sources.find(s=>s.id===args.sourceId),controller=new AbortController(),timer=setInterval(()=>{if(!isActive())controller.abort();},50);let result;
   try{
    switch(args.action){
     case 'add':result=await api.addRemoteSource({autoCheck:false,autoDownload:false,...args.config},undefined,{expectedSources:state.sources});break;
     case 'update':if(!source)throw Error('Unknown remote source');result=await api.addRemoteSource({...source,...args.config},source,{expectedSources:state.sources});break;
     case 'remove':if(!source)throw Error('Unknown remote source');await api.removeRemoteSource(source.id,{expectedSources:state.sources});result={removed:source.id,downloadsRetained:true};break;
     case 'refresh':if(!source)throw Error('Unknown remote source');{const response=await api.refreshRemoteSource(source.id,{signal:controller.signal});result={entries:response.catalog.entries.length,errors:response.errors};}break;
     case 'download':{
      const entry=state.catalogs.find(c=>c.sourceId===args.sourceId)?.entries.find(e=>e.resourceId===args.resourceId&&(args.versionId===undefined||e.versionId===args.versionId));
      if(!source||!entry)throw Error('Unknown current remote catalog resource');
      const bytes=await api.downloadRemoteResource({...entry,sourceId:source.id,remote:true},{signal:controller.signal});result={sourceId:source.id,resourceId:entry.resourceId,versionId:entry.versionId,bytes:bytes.length};break;
     }
     case 'delete-cache':{
      const entry=state.downloads.find(e=>e.sourceId===args.sourceId&&e.resourceId===args.resourceId);if(!entry)throw Error('Unknown downloaded resource');
      result={deletedVersions:await api.deleteRemoteDownload(entry,{expectedDownloads:state.downloads})};break;
     }
     default:throw Error('Unknown remote action');
    }
    return {...await describe(await raw()),result};
   }finally{clearInterval(timer);}
  };
  const pending=tail.then(work);tail=pending.catch(()=>{});return pending;
 };
 return run;
}
