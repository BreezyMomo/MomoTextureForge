import test from 'node:test';
import assert from 'node:assert/strict';
import {createComponentSession} from '../web/editor-component-session.js';
import {editorRevision} from '../web/editor-live-authoring.js';
import {project} from '../web/tree-model.js';

test('component revision guards include owner/list changes and captures cannot authorize canvas writes',async()=>{
 let state={active:false,project:null,guard:{owner:project(),entries:[]}},calls=0;
 const run=createComponentSession({getSession:()=>structuredClone(state),revision:editorRevision,operate:()=>{calls++;state.active=true;state.project=project();}});
 const first=await run('component-state',{},()=>true);assert.equal(first.guard,undefined);
 await assert.rejects(run('component-capture',{},()=>true),/Open a component/);
 state.guard.entries.push({id:'changed'});await assert.rejects(run('component-edit',{expectedSessionRevision:first.revision},()=>true),/changed/);assert.equal(calls,0);
 const fresh=await run('component-state',{},()=>true);await assert.rejects(run('component-edit',{expectedSessionRevision:fresh.revision},()=>false));assert.equal(calls,0);
 await run('component-edit',{expectedSessionRevision:fresh.revision},()=>true);const captured=await run('component-capture',{},()=>true);assert.match(captured.editRevision,/^component:[a-f0-9]{64}$/);assert.ok(Buffer.from(captured.zip,'base64').length>100);
});
