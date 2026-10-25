import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

export class EditorExportJobs{
 constructor(service){this.service=service;this.jobs=new Map();this.tail=Promise.resolve();}
 state(job){return {jobId:job.id,snapshotId:job.snapshot.snapshotId,pageId:job.snapshot.pageId,status:job.status,format:job.options.format,progress:job.progress,result:job.result??null,error:job.error??null};}
 read(id){const job=this.jobs.get(id);if(!job)throw Error('Unknown export job');return this.state(job);}
 cancel(id){const job=this.jobs.get(id);if(!job)throw Error('Unknown export job');if(['queued','running'].includes(job.status)){job.status='canceled';job.controller.abort();}return this.state(job);}
 revoke(pageId){for(const job of this.jobs.values())if(!pageId||job.snapshot.pageId===pageId)this.cancel(job.id);}
 start(snapshotId,options){
  const snapshot=this.service.get(snapshotId);
  if([...this.jobs.values()].filter(j=>['queued','running'].includes(j.status)).length>=4)throw Error('Four export jobs are already pending');
  const job={id:randomUUID(),snapshot:{...snapshot},options:{...options},status:'queued',progress:{phase:'queued'},controller:new AbortController()};this.jobs.set(job.id,job);
  const work=async()=>{
   if(job.status==='canceled')return;
   try{
    const valid=()=>{const page=this.service.bridge.status(snapshot.pageId);if(job.controller.signal.aborted||!page.connected||page.connectionId!==snapshot.connectionId)throw Error('Export canceled or source page disconnected');};
    valid();job.status='running';const bytes=await readFile(snapshot.sourceProject);
    if(createHash('sha256').update(bytes).digest('hex')!==snapshot.revision)throw Error('Snapshot file changed; capture again');
    const result=await this.service.runBrowser('runProjectTool',{action:'export',input:{zip:bytes.toString('base64')},options},600000,{signal:job.controller.signal,onProgress:progress=>{if(job.status==='running')job.progress=progress;}});
    valid();if(!result.ok)throw Error(result.error);if(typeof result.data!=='string'||result.data.length>89478488)throw Error('Invalid export output');
    const output=Buffer.from(result.data,'base64');if(output.length>64*1024*1024||!['png','exr','zip','gif','psd','svg'].includes(result.extension))throw Error('Invalid export output');
    const directory=resolve(await this.service.directory(),'export-'+job.id);await mkdir(directory);valid();
    const file=resolve(directory,'output.'+result.extension);await writeFile(file,output,{flag:'wx'});valid();
    const {data,...metadata}=result;job.result={...metadata,file,bytes:output.length,sha256:createHash('sha256').update(output).digest('hex'),sourceRevision:snapshot.revision};job.progress={phase:'complete'};job.status='completed';
   }catch(error){if(job.status!=='canceled'){job.status='failed';job.error=error.message;}}
  };
  this.tail=this.tail.then(work,work);
  // Keep recent completed metadata without bounding or changing running work.
  for(const old of [...this.jobs.values()])if(this.jobs.size>32&&!['queued','running'].includes(old.status))this.jobs.delete(old.id);
  return this.state(job);
 }
}
