import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {EditorExportJobs} from '../editor-export-jobs.mjs';

test('export jobs report progress, pin snapshot bytes, cancel actual runner and recover for the next job',async()=>{
 await mkdir('test-results/export-jobs',{recursive:true});const directory=await mkdtemp(resolve('test-results/export-jobs/run-')),file=resolve(directory,'snapshot.zip'),input=Buffer.from('snapshot');await writeFile(file,input);
 const snapshot={snapshotId:'snapshot',pageId:'page',connectionId:'connection',sourceProject:file,revision:createHash('sha256').update(input).digest('hex')};let connected=true,started,aborted=false;
 const service={get:()=>snapshot,directory:async()=>directory,bridge:{status:()=>({connected,connectionId:'connection'})},runBrowser:async(method,data,timeout,{signal,onProgress})=>{assert.equal(data.input.zip,input.toString('base64'));onProgress({phase:'encoding'});if(data.options.format==='gif')await new Promise((resolve,reject)=>{started();signal.addEventListener('abort',()=>{aborted=true;reject(Error('canceled'));});});return {ok:true,data:Buffer.from('encoded').toString('base64'),extension:'png'};}};
 const jobs=new EditorExportJobs(service),running=new Promise(resolve=>started=resolve),first=jobs.start('snapshot',{format:'gif'});await running;assert.equal(jobs.read(first.jobId).progress.phase,'encoding');jobs.cancel(first.jobId);await jobs.tail;assert.equal(aborted,true);assert.equal(jobs.read(first.jobId).status,'canceled');
 const next=jobs.start('snapshot',{format:'png'});await jobs.tail;const completed=jobs.read(next.jobId);assert.equal(completed.status,'completed');assert.equal(await readFile(completed.result.file,'utf8'),'encoded');assert.equal(completed.result.sourceRevision,snapshot.revision);
 await writeFile(file,'tampered');const stale=jobs.start('snapshot',{format:'png'});await jobs.tail;assert.match(jobs.read(stale.jobId).error,/Snapshot file changed/);
 connected=false;const disconnected=jobs.start('snapshot',{format:'png'});await jobs.tail;assert.equal(jobs.read(disconnected.jobId).status,'failed');assert.match(jobs.read(disconnected.jobId).error,/disconnected/);
});
