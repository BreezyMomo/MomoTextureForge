import test from 'node:test';
import assert from 'node:assert/strict';
import {UnifiedGraphicsLibrary} from '../web/unified-graphics-library.js';
import {createUnifiedLibraryBridge} from '../web/editor-unified-library.js';
import {editorRevision} from '../web/editor-live-authoring.js';
import {builtinIdentity,bytesHash,bundleKey} from '../web/graphics-library.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {BY_ID} from '../web/catalog.js';
import {project,node,cloneNode,PRESET_SCHEMA} from '../web/tree-model.js';
import {createProjectResource} from '../web/project-resources.js';
import {editedGraphicRoot} from '../web/graphics-package.js';

async function fixture({builtins=[]}={}){
 const records=new Map(),bundles=new Map();let reads=0,writes=0;
 const save=async(entry,bytes,options={})=>{const old=records.get(entry.resourceId);if(old&&old.versionId===entry.versionId&&old.hash!==await bytesHash(bytes))throw Error('Conflict');if(options.expectedLocal&&old.hash!==options.expectedLocal.hash)throw Error('Stale');const result={...entry,hash:await bytesHash(bytes)};records.set(entry.resourceId,result);bundles.set(bundleKey(result),bytes);writes++;return result;};
 const store=new UnifiedGraphicsLibrary({builtins:()=>builtins,readLocal:async()=>[...records.values()],readBundle:async key=>{reads++;return bundles.get(key);},readSources:async()=>[],readCatalogs:async()=>[],readDownloads:async()=>[],save,remove:async id=>records.delete(id),storage:null});
 async function seed(root=node('shape','Circle'),name='User graphic'){
  const entry={resourceId:crypto.randomUUID(),versionId:1,personalRevision:0,name,aliases:{en:'Resource alias'},category:'Fixture',description:'',kind:'composition',thumbnail:''};
  const bytes=await encodeResourcePack({schema:PRESET_SCHEMA,root,graphicResource:entry});return save(entry,bytes);
 }
 return {store,records,bundles,seed,save,get reads(){return reads;},get writes(){return writes;}};
}
test('sidebar descriptors and management variants share resources without reading bundles or creating list copies',async()=>{
 const f=await fixture({builtins:[BY_ID.get('Circle')]}),entry=await f.seed();await f.store.refresh();assert.equal(f.store.entries().length,2);assert.equal(f.reads,0);assert.equal(f.store.find(entry.resourceId).root,null);assert.equal(f.records.size,1);
 const loaded=await f.store.materialize(entry.resourceId);assert.equal(loaded.id,entry.resourceId);assert.equal(loaded.root.kind,'shape');assert.equal(f.records.size,1);assert.equal(f.store.find(entry.resourceId).root,loaded.root);
});
test('unchanged builtins and linked originals reuse their library records during legacy migration',async()=>{
 const builtin=BY_ID.get('Circle'),f=await fixture({builtins:[builtin]}),original=await f.seed();
 const built=createProjectResource(node('shape','Circle'),{resourceId:await builtinIdentity('Circle'),versionId:builtin.definition.revision,name:builtin.definition.name,aliases:builtin.definition.aliases,builtin:'Circle'}),linked=createProjectResource(node('shape','Circle'),original);
 const before=JSON.stringify([built,linked]),result=await f.store.migrateLegacy([built,linked]);assert.equal(result.copied,0);assert.deepEqual(result.pending,[]);assert.equal(f.records.size,1);assert.equal(JSON.stringify([built,linked]),before);assert.equal(f.store.find(linked.id).id,original.resourceId);
});
test('personal parameters, effects, keys and aliases migrate into an independent resource and retries do not duplicate it',async()=>{
 const f=await fixture(),original=await f.seed(),entry=createProjectResource(node('shape','Circle'),original);entry.personalRevision=2;entry.name='Blue variant';entry.aliases={en:'Blue variant','zh-CN':'蓝色变体'};entry.root.color.high='#3366ff';entry.root.params[0]=.27;entry.root.postEffects.bloom.enabled=true;entry.root.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,0],[1,1]]};
 const before=structuredClone(entry),result=await f.store.migrateLegacy([entry]);assert.equal(result.copied,1);assert.equal(result.pending.length,0);assert.equal(f.records.size,2);const id=result.mappings[0][1];assert.notEqual(id,original.resourceId);const resource=await f.store.materialize(id);assert.equal(resource.root.params[0],.27);assert.equal(resource.root.color.high,'#3366ff');assert.deepEqual(resource.root.tracks.opacity,entry.root.tracks.opacity);assert.deepEqual(resource.aliases,entry.aliases);assert.deepEqual(entry,before);
 await f.store.migrateLegacy([entry]);assert.equal(f.records.size,2);
});
test('failed migration preserves the original entry as pending and never edits its source',async()=>{
 const f=await fixture(),entry=createProjectResource(node('shape','Circle'),{name:'Only in old list'}),before=JSON.stringify(entry);f.store.save=async()=>{throw Error('Disk unavailable');};
 const result=await f.store.migrateLegacy([entry]);assert.equal(result.pending.length,1);assert.equal(result.mappings.length,0);assert.equal(JSON.stringify(entry),before);assert.equal(f.records.size,0);
});
test('saving changes publishes one resource version while previously inserted instances remain independent',async()=>{
 const f=await fixture(),original=await f.seed();await f.store.refresh();const loaded=await f.store.materialize(original.resourceId),instance=cloneNode(loaded.root),before=JSON.stringify(instance),modified=cloneNode(loaded.root);modified.opacity=.4;
 const saved=await f.store.saveRoot(modified,{existing:loaded,name:loaded.name});assert.equal(saved.resourceId,original.resourceId);assert.equal(saved.versionId,2);assert.equal(f.records.size,1);assert.equal(saved.root.opacity,.4);assert.equal(JSON.stringify(instance),before);
 const pack=await readResourcePack(f.bundles.get(bundleKey(saved)));try{assert.equal(pack.payload.root.opacity,.4);}finally{pack.rollback();}
});
test('builtin edits save a personal resource and cannot delete the builtin original',async()=>{
 const f=await fixture({builtins:[BY_ID.get('Circle')]});await f.store.refresh();const original=f.store.entries()[0],saved=await f.store.saveRoot(original.root,{existing:original,name:'My circle'});assert.notEqual(saved.resourceId,original.resourceId);assert.equal(f.store.entries().length,2);await assert.rejects(f.store.delete(original),e=>e.messageKey==='unified.readOnlyResource');
});
test('legacy MCP list endpoints address the unified library; insertion clones resources and saves do not edit the canvas',async()=>{
 const f=await fixture(),original=await f.seed();await f.store.refresh();let canvas=project();canvas.root.children=[];
 const bridge=createUnifiedLibraryBridge({store:f.store,getProject:()=>canvas,commitProject:next=>canvas=next,revision:editorRevision,destination:async()=>null});
 let list=await bridge('graphics-list');assert.equal(list.total,1);const base=await editorRevision(JSON.stringify(canvas));
 const inserted=await bridge('graphics-list-edit',{action:'insert-list',entryId:original.resourceId,expectedRevision:base,expectedListRevision:list.revision});assert.equal(canvas.root.children.length,1);assert.equal(inserted.entryId,original.resourceId);assert.equal(f.records.size,1);
 list=await bridge('graphics-list');const before=JSON.stringify(canvas);await bridge('graphics-list-edit',{action:'save-node',nodeId:canvas.root.children[0].id,name:'Saved instance',expectedRevision:await editorRevision(before),expectedListRevision:list.revision});assert.equal(f.records.size,2);assert.equal(JSON.stringify(canvas),before);
});
test('unified MCP revisions reject stale writes after a library change',async()=>{
 const f=await fixture(),original=await f.seed();await f.store.refresh();const canvas=project(),bridge=createUnifiedLibraryBridge({store:f.store,getProject:()=>canvas,commitProject:()=>{throw Error('Unexpected canvas mutation');},revision:editorRevision,destination:async()=>null}),list=await bridge('graphics-list');
 await f.seed(node(),'Another resource');await assert.rejects(bridge('graphics-list-edit',{action:'remove',entryId:original.resourceId,expectedRevision:await editorRevision(JSON.stringify(canvas)),expectedListRevision:list.revision}),/changed/);assert.equal(f.records.size,2);
});

test('remote metadata appears without downloads and changing the preferred source keeps one shared entry',async()=>{
 const f=await fixture(),local=await f.seed();let downloads=0;const remote={...local,sourceId:'remote',remote:true,sha256:local.hash};
 f.store.readSources=async()=>[{id:'remote',enabled:true,name:'Fixture remote'}];f.store.readCatalogs=async()=>[{sourceId:'remote',entries:[remote]}];f.store.download=async()=>{downloads++;return f.bundles.get(bundleKey(local));};
 await f.store.refresh();assert.equal(f.store.items.length,2);assert.equal(f.store.entries().length,1);assert.equal(downloads,0);assert.equal(f.store.entries()[0].remote,undefined);
 const {graphicVariantKey}=await import('../web/graphics-identity.js');f.store.select(local.resourceId,graphicVariantKey(remote));assert.equal(f.store.entries()[0].remote,true);await f.store.materialize(f.store.entries()[0]);assert.equal(downloads,1);assert.equal(f.records.size,1);
});

test('downloaded resources expose a folder variant that reads directly from disk and preserves edit-as-new behavior',async()=>{
 const f=await fixture(),entry=await f.seed();entry.folder=true;entry.libraryId='current';entry.remoteOrigin={sourceId:'team',name:'Team',url:'https://example.test/index.json',file:'https://example.test/resource.zip'};
 f.store.readSources=async()=>[{id:'team',enabled:true,name:'Team'}];f.store.readCatalogs=async()=>[{sourceId:'team',entries:[{...entry,sha256:entry.hash,file:entry.remoteOrigin.file}]}];f.store.download=async()=>{throw Error('The folder choice must not use the remote reader');};
 await f.store.refresh();assert.equal(f.store.items.length,2);assert.equal(f.store.entries().length,1);const folder=f.store.find(entry.resourceId);assert.equal(folder.folderVariant,true);assert.equal(folder.remote,true);assert.equal(f.records.size,1);assert.equal(f.reads,0);
 const materialized=await f.store.materialize(folder);assert.ok(materialized.root);assert.equal(f.reads,1);const saved=await f.store.saveRoot(materialized.root,{existing:materialized,name:'Independent edit'});assert.notEqual(saved.resourceId,entry.resourceId);assert.equal(entry.versionId,1);assert.equal(f.records.size,2);
 f.store.select(entry.resourceId,'local:'+entry.resourceId+'@1');f.records.delete(entry.resourceId);await f.store.refresh();assert.equal(f.store.find(entry.resourceId).folderVariant,undefined);
});

test('code and image editing retain node appearance and animation while applying explicit parameter defaults',()=>{
 const source=node('shape','Circle'),before=structuredClone(source);source.color.high='#123456';source.transform.rotation=37;source.postEffects.bloom.enabled=true;source.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,.2],[1,.8]]};
 const definition=structuredClone(BY_ID.get('Circle').definition);definition.defaults[0]=.31;const root=editedGraphicRoot(source,'asset_edited',definition);
 assert.equal(root.params[0],.31);assert.equal(root.type,'asset_edited');assert.deepEqual(root.color,source.color);assert.deepEqual(root.transform,source.transform);assert.deepEqual(root.postEffects,source.postEffects);assert.deepEqual(root.tracks,source.tracks);assert.equal(source.type,before.type);assert.equal(source.params[0],before.params[0]);assert.notEqual(root.id,source.id);
});
