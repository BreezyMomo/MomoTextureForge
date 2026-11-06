import test from 'node:test';
import assert from 'node:assert/strict';
import {RemoteResourceStore,mergeRemoteResources} from '../web/remote-resource-store.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {bytesHash} from '../web/graphics-library.js';
import {node,PRESET_SCHEMA} from '../web/tree-model.js';

const id='a0000000-0000-4000-8000-000000000001';
async function fixture(){
 const source={id:'team',name:'Team',url:'https://example.test/index.json',enabled:true},state={binding:{token:'A'},entries:[],bytes:null,epoch:0,fetches:0,writes:0};
 async function pack(versionId=1){const meta={resourceId:id,versionId,personalRevision:0,name:'Remote',kind:'formula',aliases:{en:'Remote'},thumbnail:''},bytes=await encodeResourcePack({schema:PRESET_SCHEMA,root:node('shape','Circle'),graphicResource:meta});return {item:{...meta,sourceId:source.id,file:'https://example.test/v'+versionId+'.zip',sha256:await bytesHash(bytes)},bytes};}
 const first=await pack(),catalog={sourceId:source.id,entries:[first.item]};
 const folder={binding:async()=>state.binding,connected:async()=>{if(!state.binding)throw Error('Not bound');if(state.permission===false)throw Error('No permission');return {binding:state.binding};},entries:async()=>structuredClone(state.entries),bundle:async()=>state.bytes.slice(),save:async(meta,bytes,options)=>{await options.isActive();await state.beforeCommit?.();await options.isActive();state.writes++;state.entries=[{...meta,hash:await bytesHash(bytes),folder:true,libraryId:state.binding.token}];state.bytes=bytes.slice();},remove:async()=>{state.epoch++;state.entries=[];state.bytes=null;return {removed:true,complete:true};}};
 const store=new RemoteResourceStore({folder,target:run=>run(),sources:async()=>source?[source]:[],catalogs:async()=>[catalog],epoch:async()=>state.epoch,fetchBundle:async(item,options)=>{state.fetches++;await state.gate?.();if(options.signal?.aborted)throw Error('Canceled');return state.networkBytes??first.bytes;}});
 return {store,folder,state,source,catalog,first,pack};
}
test('remote previews use bounded volatile memory without binding or folder writes',async()=>{
 const f=await fixture();f.state.binding=null;assert.deepEqual(await f.store.read(f.first.item),f.first.bytes);assert.deepEqual(await f.store.read(f.first.item),f.first.bytes);assert.equal(f.state.fetches,1);assert.equal(f.state.writes,0);assert.deepEqual(await f.store.downloads(),[]);
 await assert.rejects(f.store.save(f.first.item),/Not bound/);assert.equal(f.state.fetches,1);
});
test('remote persistence requires permission before network and saves exact bytes with provenance',async()=>{
 const f=await fixture();f.state.permission=false;await assert.rejects(f.store.save(f.first.item),/permission/);assert.equal(f.state.fetches,0);f.state.permission=true;
 assert.deepEqual(await f.store.save(f.first.item),f.first.bytes);assert.equal(f.state.writes,1);const [saved]=await f.store.downloads();assert.equal(saved.folder,true);assert.equal(saved.sourceId,'team');assert.equal(saved.remoteOrigin.file,f.first.item.file);assert.equal(saved.libraryId,'A');assert.deepEqual(saved.aliases,{en:'Remote'});
 f.source.enabled=false;assert.deepEqual(await f.store.save(saved),f.first.bytes);assert.equal(f.state.fetches,1);assert.equal(f.state.writes,1);
});
test('saved state follows the current folder and mirror sources share its one physical copy',async()=>{
 const f=await fixture();await f.store.save(f.first.item);const items=mergeRemoteResources(f.state.entries,[f.source,{...f.source,id:'mirror'}],[f.catalog,{...f.catalog,sourceId:'mirror'}],await f.store.downloads());assert.equal(items.length,2);assert.ok(items.every(item=>item.cached&&item.folder&&item.hash===f.first.item.sha256));f.state.entries=[];f.state.binding={token:'B'};assert.deepEqual(await f.store.downloads(),[]);assert.ok(mergeRemoteResources([], [f.source],[f.catalog],[]).every(item=>!item.cached));
});
test('hash failures, conflicts and personal-original overwrites never publish a remote resource',async()=>{
 const f=await fixture();f.state.networkBytes=new Uint8Array([1]);await assert.rejects(f.store.save(f.first.item),e=>e.messageKey==='remote.hashMismatch');assert.equal(f.state.writes,0);
 f.state.entries=[{...f.first.item,hash:'f'.repeat(64),sha256:'f'.repeat(64)}];await assert.rejects(f.store.save(f.first.item),/不同内容/);
 const next=await f.pack(3);f.catalog.entries=[next.item];f.state.networkBytes=next.bytes;f.state.entries=[{...f.first.item,hash:f.first.item.sha256}];await assert.rejects(f.store.save(next.item),e=>e.messageKey==='folder.versionConflict');assert.equal(f.state.writes,0);
});
test('switching folders or changing the source during a save cannot redirect late writes',async()=>{
 for(const change of [f=>f.state.binding={token:'B'},f=>f.source.enabled=false,f=>f.source.url='https://changed.test/index.json',f=>f.catalog.entries=[]]){
  const f=await fixture();let release,started;const wait=new Promise(ok=>started=ok);f.state.gate=()=>{started();return new Promise(ok=>release=ok);};const pending=f.store.save(f.first.item);await wait;change(f);release();await assert.rejects(pending);assert.equal(f.state.writes,0);
 }
});
test('deleting or changing an original during an update prevents resurrection',async()=>{
 for(const remove of [true,false]){const f=await fixture();await f.store.save(f.first.item);const next=await f.pack(3);f.catalog.entries=[next.item];f.state.networkBytes=next.bytes;f.state.beforeCommit=async()=>{if(remove){f.state.epoch++;f.state.entries=[];}else f.catalog.entries=[];};await assert.rejects(f.store.save(next.item));assert.equal(f.state.writes,1);}
});
test('version jumps preserve identity; stale delete plans and changed destinations are rejected',async()=>{
 const f=await fixture();await f.store.save(f.first.item);const before=await f.store.downloads(),next=await f.pack(5);f.catalog.entries=[next.item];f.state.networkBytes=next.bytes;await f.store.save(next.item);assert.equal(f.state.entries[0].versionId,5);
 await assert.rejects(f.store.remove(before[0],{expectedDownloads:before}),e=>e.messageKey==='folder.indexChanged');await assert.rejects(f.store.remove((await f.store.downloads())[0],{expectedDestination:'B'}),e=>e.messageKey==='folder.destinationChanged');assert.equal(f.state.entries.length,1);
 const result=await f.store.remove((await f.store.downloads())[0]);assert.equal(result.complete,true);assert.deepEqual(await f.store.downloads(),[]);
});
