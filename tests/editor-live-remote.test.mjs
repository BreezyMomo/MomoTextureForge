import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveRemote} from '../web/editor-live-remote.js';
import {editorRevision} from '../web/editor-live-authoring.js';
import {sourceConfig} from '../web/remote-library-model.js';

test('remote edits serialize concurrent revisions and never implicitly fetch new sources',async()=>{
 let sources=[],fetches=0;const api={remoteSources:async()=>structuredClone(sources),remoteCatalogs:async()=>[],remoteDownloads:async()=>[],addRemoteSource:async(input,previous,{expectedSources})=>{assert.deepEqual(sources,expectedSources);const next=sourceConfig(input,previous);sources=[next];return next;},refreshRemoteSource:async()=>{fetches++;return {catalog:{entries:[]},errors:[]};},removeRemoteSource:async(id,{expectedSources})=>{assert.deepEqual(sources,expectedSources);sources=[];}};
 const run=createLiveRemote({revision:editorRevision,api}),first=await run('remote-state',{},()=>true);
 const added=await run('remote-edit',{expectedRemoteRevision:first.revision,action:'add',config:{name:'Fixture',url:'https://example.test/catalog/'}},()=>true);assert.equal(fetches,0);assert.equal(added.result.autoCheck,false);assert.equal(added.result.autoDownload,false);
 const input={expectedRemoteRevision:added.revision,action:'update',sourceId:added.result.id,config:{name:'Changed'}};
 const results=await Promise.allSettled([run('remote-edit',input,()=>true),run('remote-edit',input,()=>true)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(fetches,0);
 const fresh=await run('remote-state',{},()=>true);await assert.rejects(run('remote-edit',{...input,expectedRemoteRevision:fresh.revision},()=>false),/expired/);
 const removed=await run('remote-edit',{expectedRemoteRevision:fresh.revision,action:'remove',sourceId:added.result.id},()=>true);assert.equal(removed.revision,first.revision);
});


test('background remote cancellation aborts the native request and releases the mutation queue',async()=>{
 const sources=[sourceConfig({name:'Slow',url:'https://example.test/slow',autoCheck:false})];let aborted=false,started=false;
 const api={remoteSources:async()=>sources,remoteCatalogs:async()=>[],remoteDownloads:async()=>[],refreshRemoteSource:async(id,{signal})=>new Promise((resolve,reject)=>{started=true;signal.addEventListener('abort',()=>{aborted=true;reject(Error('Aborted'));},{once:true});})};
 const run=createLiveRemote({revision:editorRevision,api}),state=await run('remote-state',{},()=>true),job=await run('remote-edit',{expectedRemoteRevision:state.revision,action:'refresh',sourceId:sources[0].id,background:true},()=>true);
 for(let i=0;i<100&&!started;i++)await new Promise(r=>setTimeout(r,5));assert.ok(started);
 assert.equal((await run('remote-job',{jobId:job.jobId,action:'cancel'},()=>true)).status,'canceled');
 const after=await run('remote-state',{},()=>true);assert.ok(aborted);assert.equal(after.revision,state.revision);assert.equal((await run('remote-job',{jobId:job.jobId,action:'status'},()=>true)).status,'canceled');
});
