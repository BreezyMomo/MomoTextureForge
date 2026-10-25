import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveListBatch} from '../web/editor-live-list-batch.js';
import {editorRevision as revision} from '../web/editor-live-authoring.js';
import {project,node} from '../web/tree-model.js';

const wait=()=>new Promise(resolve=>setTimeout(resolve,0));
async function terminal(run,id){for(let i=0;i<200;i++){const value=await run('graphics-list-job',{jobId:id});if(['completed','canceled','failed'].includes(value.status))return value;await wait();}throw Error('Batch did not finish');}
function fixture(options={}){
 let p=project(),entries=[],commits=0,rollbacks=0,active=true,step=0;const libraryRevision='a'.repeat(64),ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
 const items=ids.map((resourceId,i)=>({key:'key'+i,resourceId,versionId:1,name:'Fixture '+i,kind:'formula'}));
 const run=createLiveListBatch({getProject:()=>p,getEntries:()=>entries,revision,commit:(next,list)=>{p=next;entries=list;commits++;},
  library:async(op,args)=>op==='library-list'?{revision:libraryRevision}:op==='library-detail'?{revision:libraryRevision,item:items.find(i=>i.key===args.key)}:{item:items.find(i=>i.key===args.key),zip:btoa(args.key)},
  readPack:async bytes=>{const meta=items.find(i=>i.key===new TextDecoder().decode(bytes));return {payload:{root:node(),graphicResource:meta},register(){},rollback(){rollbacks++;},persist:async()=>{}};},
  yieldControl:async()=>{step++;await options.step?.({step,run,getProject:()=>p,setActive:()=>{active=false;}});},validatePack:options.validatePack});
 return {run,items,get commits(){return commits;},get rollbacks(){return rollbacks;},get entries(){return entries;},get p(){return p;},args:async()=>({keys:items.map(i=>i.key),expectedRevision:await revision(JSON.stringify(p)),expectedListRevision:await revision(JSON.stringify(entries)),expectedLibraryRevision:libraryRevision}),start:async args=>run('graphics-list-batch',args,()=>active)};
}
test('native batch commits once, skips existing versions, and reports explicit update requirements',async()=>{
 const f=fixture(),a=await f.start(await f.args()),result=await terminal(f.run,a.jobId);assert.equal(result.status,'completed');assert.equal(result.result.added.length,3);assert.equal(f.commits,1);assert.equal(f.entries.length,3);
 const b=await f.start(await f.args()),skip=await terminal(f.run,b.jobId);assert.equal(skip.result.skipped.length,3);assert.equal(f.commits,1);
 f.items[0].versionId=2;const c=await f.start(await f.args()),update=await terminal(f.run,c.jobId);assert.equal(update.result.failures[0].needsUpdate,true);assert.equal(f.commits,1);
});
test('cancel keeps the prepared prefix; expiry and concurrent edits roll back all uncommitted packs',async()=>{
 for(const mode of ['cancel','expiry','conflict']){
  let jobId;const f=fixture({step:async({step,run,getProject,setActive})=>{if(step!==2)return;if(mode==='cancel')await run('graphics-list-job',{jobId,action:'cancel'});else if(mode==='expiry')setActive();else getProject().name='User edit';}}),job=await f.start(await f.args());jobId=job.jobId;
  const result=await terminal(f.run,jobId);if(mode==='cancel'){assert.equal(result.status,'canceled');assert.equal(result.result.added.length,1);assert.equal(f.commits,1);}else{assert.equal(result.status,'failed');assert.equal(f.commits,0);assert.equal(f.rollbacks,1);if(mode==='conflict')assert.equal(f.p.name,'User edit');}
 }
});
test('malformed or failed packs do not prevent other valid resources and stale starts fail',async()=>{
 let prepared=0;const f=fixture({validatePack:()=>{if(++prepared===2)throw Error('Bad pack');}}),args=await f.args();
 await assert.rejects(f.start({...args,expectedListRevision:'b'.repeat(64)}),/changed/);
 const job=await f.start(args),result=await terminal(f.run,job.jobId);assert.equal(result.result.added.length,2);assert.equal(result.result.failures.length,1);assert.equal(f.rollbacks,1);assert.equal(f.commits,1);
});
test('queued cancellation is immediate and pending-job limits survive concurrent starts',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;}),f=fixture({step:async({step})=>{if(step===1)await gate;}}),args=await f.args();
 const starts=await Promise.allSettled(Array.from({length:5},()=>f.start(args))),accepted=starts.filter(s=>s.status==='fulfilled').map(s=>s.value);assert.equal(accepted.length,4);assert.equal(starts.filter(s=>s.status==='rejected').length,1);
 const canceled=await f.run('graphics-list-job',{jobId:accepted[1].jobId,action:'cancel'});assert.equal(canceled.status,'canceling');release();
 assert.equal((await terminal(f.run,accepted[0].jobId)).status,'completed');assert.equal((await terminal(f.run,accepted[1].jobId)).status,'canceled');
 for(const job of accepted.slice(2))assert.equal((await terminal(f.run,job.jobId)).status,'failed');assert.equal(f.commits,1);
 const recovered=await f.start(await f.args());assert.equal((await terminal(f.run,recovered.jobId)).status,'completed');
});
