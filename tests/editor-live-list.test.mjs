import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveGraphicsList} from '../web/editor-live-list.js';
import {createLiveLibrary} from '../web/editor-live-library.js';
import {editorRevision} from '../web/editor-live-authoring.js';
import {project,node} from '../web/tree-model.js';
import {GraphicShelf,canvasProject} from '../web/persistent-graphic-list.js';
import {readResourcePack} from '../web/resource-pack.js';
import {BY_ID} from '../web/catalog.js';

function fixture(){
 const shelf=new GraphicShelf();let state=shelf.bind(project()),history=[];state.root.children=[];
 const library=createLiveLibrary({getBuiltins:()=>[BY_ID.get('Circle')],readLocal:async()=>[],readSources:async()=>[],readCatalogs:async()=>[],readDownloads:async()=>[]});
 const run=createLiveGraphicsList({getProject:()=>canvasProject(state),getEntries:()=>shelf.entries,revision:editorRevision,library,
  readPack:async bytes=>({...await readResourcePack(bytes),persist:async()=>{}}),commit:(next,entries)=>{const before=structuredClone(state);shelf.entries=entries;state=shelf.bind(next);shelf.record(before);history.push(before);}});
 return {run,library,get state(){return state;},get history(){return history;},undo(){state=shelf.restore(history.pop(),state);},args:async()=>({expectedRevision:await editorRevision(JSON.stringify(canvasProject(state))),expectedListRevision:(await run('graphics-list')).revision})};
}

test('personal list reads remain available during component trials while canvas writes stay guarded',async()=>{
 const entries=[{id:'trial-entry',name:'Trial component',root:{kind:'shape',type:'Circle'}}];let projectReads=0;
 const run=createLiveGraphicsList({getProject:()=>{projectReads++;throw Error('Return to canvas');},getEntries:()=>entries,commit:()=>{},revision:editorRevision});
 assert.equal((await run('graphics-list')).entries[0].id,'trial-entry');
 assert.deepEqual((await run('graphics-list',{id:'trial-entry'})).entry,entries[0]);
 assert.equal(projectReads,0);
 await assert.rejects(run('graphics-list-edit',{action:'remove',entryId:'trial-entry'}),/Return to canvas/);
 assert.equal(projectReads,1);assert.equal(entries.length,1);
});

test('library to personal list to canvas is scoped, rename/remove preserve existing instances and undo restores list',async()=>{
 const f=fixture(),key=(await f.library('library-list')).items[0].key;
 const added=await f.run('graphics-list-edit',{...await f.args(),action:'add-library',libraryKey:key});assert.equal(added.persisted,true);assert.equal(f.state.root.children.length,0);assert.equal(f.state.projectResources.length,1);
 const same=await f.run('graphics-list-edit',{...await f.args(),action:'add-library',libraryKey:key});assert.equal(same.applied,false);assert.equal(f.history.length,1);
 const inserted=await f.run('graphics-list-edit',{...await f.args(),action:'insert-list',entryId:added.entryId});assert.equal(f.state.root.children[0].id,inserted.nodeId);const instance=structuredClone(f.state.root.children[0]);
 await f.run('graphics-list-edit',{...await f.args(),action:'rename',entryId:added.entryId,name:'Renamed copy',aliases:{en:'Renamed'}});assert.deepEqual(f.state.root.children[0],instance);assert.equal(f.state.projectResources[0].personalRevision,1);
 await f.run('graphics-list-edit',{...await f.args(),action:'remove',entryId:added.entryId});assert.equal(f.state.projectResources.length,0);assert.deepEqual(f.state.root.children[0],instance);
 f.undo();assert.equal(f.state.projectResources[0].name,'Renamed copy');assert.deepEqual(f.state.root.children[0],instance);
});

test('list save/update and direct library insert preserve source scopes and reject stale or invalid edits',async()=>{
 const f=fixture(),key=(await f.library('library-list')).items[0].key;
 const inserted=await f.run('graphics-list-edit',{...await f.args(),action:'insert-library',libraryKey:key});assert.equal(f.state.projectResources.length,0);assert.equal(f.state.root.children[0].resourceRef,undefined);
 const saved=await f.run('graphics-list-edit',{...await f.args(),action:'save-node',nodeId:inserted.nodeId,name:'Saved circle'});assert.equal(f.state.root.children[0].resourceRef,saved.entryId);
 const old=f.state.projectResources[0].root.params[0];f.state.root.children[0].params[0]=.3;
 assert.equal(f.state.projectResources[0].root.params[0],old);
 await f.run('graphics-list-edit',{...await f.args(),action:'replace-from-node',entryId:saved.entryId,nodeId:inserted.nodeId});assert.equal(f.state.projectResources[0].root.params[0],.3);assert.equal(f.state.projectResources[0].personalRevision,1);
 const stale=await f.args();f.state.name='User edit';await assert.rejects(f.run('graphics-list-edit',{...stale,action:'remove',entryId:saved.entryId}));
 const before=JSON.stringify(f.state);await assert.rejects(f.run('graphics-list-edit',{...await f.args(),action:'insert-list',entryId:saved.entryId,parentId:inserted.nodeId}));assert.equal(JSON.stringify(f.state),before);
 const full=await f.run('graphics-list-edit',{...await f.args(),action:'save-node',nodeId:'@root',name:'Whole canvas'});assert.equal((await f.run('graphics-list',{id:full.entryId})).entry.root.children.length,1);
});
