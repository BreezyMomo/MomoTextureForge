import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveLibrary} from '../web/editor-live-library.js';
import {BY_ID} from '../web/catalog.js';
import {readResourcePack,encodeResourcePack} from '../web/resource-pack.js';
import {node,PRESET_SCHEMA} from '../web/tree-model.js';
import {bytesHash} from '../web/graphics-library.js';

test('full library separates local and remote variants, exposes conflicts and never downloads',async()=>{
 const resourceId='11111111-1111-4111-8111-111111111111',meta={resourceId,versionId:1,personalRevision:0,name:'Local shape',aliases:{en:'Local alias'},category:'Test',kind:'composition'},bytes=await encodeResourcePack({schema:PRESET_SCHEMA,root:node('group'),graphicResource:meta});
 const hash=await bytesHash(bytes);let bundleReads=0;
 const run=createLiveLibrary({getBuiltins:()=>[BY_ID.get('Circle')],readLocal:async()=>[{...meta,hash}],readSources:async()=>[{id:'enabled',name:'Online',enabled:true},{id:'disabled',name:'Disabled',enabled:false}],
  readCatalogs:async()=>[{sourceId:'enabled',entries:[{...meta,sha256:'different'}]},{sourceId:'disabled',entries:[{...meta,versionId:2}]}],readDownloads:async()=>[{...meta,remote:true,sourceId:'disabled',sha256:hash}],
  readLocalBundle:async()=>{bundleReads++;return bytes;},readRemoteBundle:async item=>{bundleReads++;return item.sourceId==='disabled'?bytes:null;}});
 const list=await run('library-list');assert.equal(list.total,4);assert.equal(bundleReads,0);assert.ok(list.items.filter(i=>i.resourceId===resourceId).every(i=>i.conflict));
 assert.equal((await run('library-list',{query:'Local alias',source:'local'})).total,1);assert.equal((await run('library-list',{source:'downloaded'})).total,1);assert.equal((await run('library-list',{sourceId:'disabled'})).items[0].versionId,1);
 assert.equal((await run('library-list',{offset:1,limit:1})).items.length,1);
 const remote=list.items.find(i=>i.sourceId==='enabled');assert.ok((await run('library-detail',{key:remote.key})).details.detailsUnavailable);await assert.rejects(run('library-export',{key:remote.key}),/not downloaded/);
 const local=list.items.find(i=>i.source==='local'),detail=await run('library-detail',{key:local.key});assert.equal(detail.item.name,'Local shape');assert.equal(detail.details.detailsUnavailable,undefined);
 const exported=await run('library-export',{key:local.key});assert.equal(exported.sha256,hash);assert.deepEqual(Buffer.from(exported.zip,'base64'),Buffer.from(bytes));
 await assert.rejects(run('library-list',{limit:101}));await assert.rejects(run('library-detail',{key:'missing'}));await assert.rejects(run('library-list',{},()=>false));
});

test('builtin export uses canonical packer with real dependencies and parameter metadata',async()=>{
 const run=createLiveLibrary({getBuiltins:()=>[BY_ID.get('Circle')],readLocal:async()=>[],readSources:async()=>[],readCatalogs:async()=>[],readDownloads:async()=>[]});
 const {items}=await run('library-list'),detail=await run('library-detail',{key:items[0].key});assert.ok(detail.details.definitions[0].parameters.length);
 const result=await run('library-export',{key:items[0].key}),pack=await readResourcePack(Buffer.from(result.zip,'base64'));
 try{assert.equal(pack.payload.schema,PRESET_SCHEMA);assert.equal(pack.payload.root.type,'Circle');assert.equal(pack.payload.graphicResource.resourceId,items[0].resourceId);}finally{pack.rollback();}
});

test('generator export retains its classification and optional source includes native GLSL',async()=>{
 const run=createLiveLibrary({getBuiltins:()=>[BY_ID.get('BallisticSparks')],readLocal:async()=>[],readSources:async()=>[],readCatalogs:async()=>[],readDownloads:async()=>[]});
 const {items}=await run('library-list'),detail=await run('library-detail',{key:items[0].key,includeSource:true});assert.equal(items[0].kind,'generator');assert.ok(detail.source.assets[0].asset.definition.generator);
 const exported=await run('library-export',{key:items[0].key}),pack=await readResourcePack(Buffer.from(exported.zip,'base64'));try{assert.equal(pack.payload.graphicResource.generator,true);}finally{pack.rollback();}
});
