import test from 'node:test';
import assert from 'node:assert/strict';
import {FolderLibrary} from '../web/folder-library.js';
import {safeLibraryPath} from '../web/library-directory-store.js';
import {bytesHash,bundleKey} from '../web/graphics-library.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {node,PRESET_SCHEMA} from '../web/tree-model.js';
import {assetFromGeneratorAuthoring,EMPTY_GENERATOR} from '../web/generator-authoring.js';
import {builtinAsset} from '../web/resource-assets.js';
import {decodeZIP} from '../web/resource-zip.js';
import {encodeZIP} from '../web/encoders.js';

const id='a0000000-0000-4000-8000-000000000001';
async function record({versionId=1,name='测试图形',resourceId=id,generator=false,thumbnail=''}={}){
 const entry={resourceId,versionId,personalRevision:0,name,aliases:{en:'Test graphic'},category:'测试',description:'',kind:'formula',thumbnail,...(generator?{generator:true}:{})};
 const root=node('shape',generator?'CustomGenerator':'Circle'),bytes=await encodeResourcePack({schema:PRESET_SCHEMA,root,graphicResource:entry},generator?{assets:[[root.type,assetFromGeneratorAuthoring(EMPTY_GENERATOR)]]}:{});
 return {entry:{...entry,hash:await bytesHash(bytes)},bytes};
}
class Store {
 constructor(){this.files=new Map();this.name='test-library';this.handle={kind:'directory',name:this.name,queryPermission:async()=>this.permission};this.permission='granted';}
 async read(path){safeLibraryPath(path);const value=this.files.get(path);if(this.corrupt===path&&value)return new Uint8Array([1,2,3]);return value?.slice()??null;}
 async immutable(path,bytes){const old=await this.read(path);if(old){if(await bytesHash(old)!==await bytesHash(bytes))throw Error('Immutable conflict');return false;}if(this.failPath===path)throw Error('Write denied');this.files.set(path,bytes.slice());this.onWrite?.(path);return true;}
 async commitIndex(bytes,check){await check(await this.read('index.json'));if(this.failCommit)throw Error('Index denied');this.files.set('index.json',bytes.slice());}
 async listFiles(){return [...this.files.keys()].filter(path=>path.startsWith('resources/')||path.startsWith('thumbnails/')).sort();}
 async removeFile(path){safeLibraryPath(path);if(this.failRemove===path)throw Error('File locked');const removed=this.files.delete(path);this.onRemove?.(path);return removed;}
 lock(id,run){return run();}
}
async function fixture(records){
 const browser=structuredClone(records??[await record()]),store=new Store(),other=new Store();other.handle.name='second-library';
 const preferences={value:null,get:async()=>preferences.value,set:async value=>{if(preferences.fail)throw Error('Preference denied');preferences.value=value;}},persistence={};
 const model=new FolderLibrary({preferences,store:handle=>handle===store.handle?store:other,readBrowser:async()=>browser.map(r=>structuredClone(r.entry)),readBrowserSnapshot:async()=>({entries:browser.map(r=>structuredClone(r.entry)),records:structuredClone(browser)}),clearBrowser:async snapshot=>{if(persistence.failClear)throw Error('Cleanup denied');assert.deepEqual(browser.map(r=>r.entry),snapshot.entries);browser.splice(0);}});
 return {model,store,other,preferences,browser,persistence};
}
const index=store=>JSON.parse(new TextDecoder().decode(store.files.get('index.json')));
const migrate=async fixture=>{await fixture.model.connect(fixture.store.handle);return fixture.model.importBrowserResources();};

test('unbound personal library is empty and creation cannot fall back to browser records',async()=>{
 const {model,store,browser}=await fixture();assert.equal((await model.status()).mode,'none');assert.deepEqual(await model.entries(),[]);const item=await record();await assert.rejects(model.save(item.entry,item.bytes),e=>e.messageKey==='folder.notConnected');assert.equal(browser.length,1);assert.equal(store.files.size,0);
});
test('opening an empty folder never copies browser records or the previous folder',async()=>{
 const {model,store,other,browser}=await fixture();await model.connect(store.handle,{name:'First'});assert.equal(index(store).entries.length,0);assert.equal((await model.legacyBrowserStatus()).count,1);
 const item=await record();await model.save(item.entry,item.bytes);const before=store.files.get('index.json').slice();await model.connect(other.handle);assert.deepEqual(await model.entries(),[]);assert.equal(index(other).entries.length,0);assert.deepEqual(store.files.get('index.json'),before);assert.equal(browser.length,1);
});
test('switching and closing libraries leaves both folders unchanged and never exposes browser originals',async()=>{
 const f=await fixture();await migrate(f);const first=f.store.files.get('index.json').slice();await f.model.connect(f.other.handle);const extra=await record({resourceId:'b0000000-0000-4000-8000-000000000002'});await f.model.save(extra.entry,extra.bytes);const second=f.other.files.get('index.json').slice();await f.model.connect(f.store.handle);assert.deepEqual((await f.model.entries()).map(e=>e.resourceId),[id]);assert.deepEqual(f.store.files.get('index.json'),first);assert.deepEqual(f.other.files.get('index.json'),second);
 await f.model.disconnect();assert.deepEqual(await f.model.entries(),[]);assert.deepEqual(f.store.files.get('index.json'),first);assert.deepEqual(f.other.files.get('index.json'),second);
});
test('an inaccessible previous folder does not prevent opening another library',async()=>{
 const {model,store,other}=await fixture();await model.connect(store.handle);store.permission='denied';assert.equal((await model.status()).state,'permission');await model.connect(other.handle);assert.equal((await model.status()).state,'ready');assert.deepEqual(await model.entries(),[]);
});
test('an invalid target or failed binding retains the current library',async()=>{
 const {model,store,other,preferences}=await fixture();await model.connect(store.handle);const token=(await model.binding()).token;other.files.set('index.json',new TextEncoder().encode('{}'));await assert.rejects(model.connect(other.handle),e=>e.messageKey==='folder.invalidIndex');assert.equal((await model.binding()).token,token);
 other.files.clear();preferences.fail=true;await assert.rejects(model.connect(other.handle),/Preference denied/);assert.equal((await model.binding()).token,token);
});
test('legacy migration verifies exact packages and aliases before removing browser originals',async()=>{
 const f=await fixture(),original=structuredClone(f.browser);await f.model.connect(f.store.handle);assert.equal(f.browser.length,1);const result=await f.model.importBrowserResources();assert.equal(result.copied,1);assert.equal(f.browser.length,0);const [entry]=await f.model.entries();assert.deepEqual(entry.aliases,{en:'Test graphic'});assert.deepEqual(await f.model.bundle(bundleKey(entry)),original[0].bytes);assert.equal((await f.model.legacyBrowserStatus()).count,0);assert.equal((await f.model.importBrowserResources()).total,0);
});

test('migration reports publication, read-back and cleanup separately before removing originals',async()=>{
 const f=await fixture(),original=f.browser[0],phases=[];await f.model.connect(f.store.handle);
 await f.model.importBrowserResources({onPhase:phase=>{phases.push(phase);assert.equal(f.browser.length,1);if(phase==='verifying'||phase==='cleaning'){assert.equal(index(f.store).entries.length,1);assert.deepEqual(f.store.files.get('resources/'+id+'-v1.zip'),original.bytes);}}});
 assert.deepEqual(phases,['publishing','verifying','cleaning']);assert.equal(f.browser.length,0);
});

test('canceling after disk verification retains browser originals and allows a verified retry',async()=>{
 const f=await fixture(),abort=new AbortController();await f.model.connect(f.store.handle);
 await assert.rejects(f.model.importBrowserResources({signal:abort.signal,onPhase:phase=>{if(phase==='cleaning')abort.abort();}}),error=>error.messageKey==='folder.canceled');
 assert.equal(f.browser.length,1);assert.equal(index(f.store).entries.length,1);await f.model.importBrowserResources();assert.equal(f.browser.length,0);assert.equal(index(f.store).entries.length,1);
});
test('native generators and all dependencies survive the one-time move',async()=>{
 const f=await fixture([await record({generator:true})]),original=f.browser[0].bytes;await migrate(f);const [entry]=await f.model.entries();assert.equal(entry.generator,true);assert.deepEqual(await f.model.bundle(bundleKey(entry)),original);assert.equal(f.browser.length,0);
});
test('a newer folder version is preserved and the exact older browser package is also saved before cleanup',async()=>{
 const f=await fixture(),old=f.browser[0];await f.model.connect(f.store.handle);const latest=await record({versionId:2});await f.model.save(latest.entry,latest.bytes);await f.model.importBrowserResources();assert.equal((await f.model.entries())[0].versionId,2);assert.deepEqual(f.store.files.get('resources/'+id+'-v1.zip'),old.bytes);assert.equal(f.browser.length,0);
});
test('legacy conflicts retain every browser original and the published folder index',async()=>{
 const f=await fixture();await f.model.connect(f.store.handle);const different=await record({name:'Different'});await f.model.save(different.entry,different.bytes);const before=f.store.files.get('index.json').slice();await assert.rejects(f.model.importBrowserResources(),e=>e.messageKey==='folder.versionConflict');assert.equal(f.browser.length,1);assert.deepEqual(f.store.files.get('index.json'),before);
});
test('failed read-back, index publication or cleanup never removes browser originals and can be retried',async()=>{
 for(const failure of ['readback','index','cleanup']){const f=await fixture();await f.model.connect(f.store.handle);if(failure==='readback')f.store.onWrite=path=>f.store.corrupt=path;if(failure==='index')f.store.failCommit=true;if(failure==='cleanup')f.persistence.failClear=true;await assert.rejects(f.model.importBrowserResources());assert.equal(f.browser.length,1);assert.ok(await f.model.binding());f.store.onWrite=null;f.store.corrupt=null;f.store.failCommit=false;f.persistence.failClear=false;await f.model.importBrowserResources();assert.equal(f.browser.length,0);assert.equal((await f.model.entries()).length,1);}
});
test('canceled or concurrently changed legacy migration keeps browser originals',async()=>{
 const f=await fixture();await f.model.connect(f.store.handle);const abort=new AbortController();await assert.rejects(f.model.importBrowserResources({signal:abort.signal,onProgress:()=>abort.abort()}),e=>e.messageKey==='folder.canceled');assert.equal(f.browser.length,1);assert.equal(index(f.store).entries.length,0);
 f.store.files.delete('resources/'+id+'-v1.zip');f.store.onWrite=()=>f.browser.push(structuredClone(f.browser[0]));await assert.rejects(f.model.importBrowserResources(),e=>e.messageKey==='folder.browserChanged');assert.equal(f.browser.length,2);assert.equal(index(f.store).entries.length,0);
});
test('lost permission rejects reads, migration and writes without browser fallback',async()=>{
 const f=await fixture();await f.model.connect(f.store.handle);f.store.permission='prompt';const item=await record();await assert.rejects(f.model.save(item.entry,item.bytes),e=>e.messageKey==='folder.permissionRequired');await assert.rejects(f.model.importBrowserResources(),e=>e.messageKey==='folder.permissionRequired');await assert.rejects(f.model.bundle(bundleKey(item.entry)),e=>e.messageKey==='folder.permissionRequired');assert.equal(f.browser.length,1);
});
test('save publishes immutable versions and rejects stale updates',async()=>{
 const f=await fixture();await migrate(f);const old=(await f.model.entries())[0],path=index(f.store).entries[0].file,next=await record({versionId:2});await f.model.save(next.entry,next.bytes,{update:true,expectedLocal:{versionId:1,hash:old.hash}});assert.equal((await f.model.entries())[0].versionId,2);assert.ok(f.store.files.has(path));const third=await record({versionId:3});await assert.rejects(f.model.save(third.entry,third.bytes,{update:true,expectedLocal:{versionId:1,hash:old.hash}}),e=>e.messageKey==='folder.versionConflict');
});
test('batch imports publish together, reject stale snapshots and delete withdrawn files',async()=>{
 const f=await fixture([]);await f.model.connect(f.store.handle);const first=await record(),second=await record({resourceId:'b0000000-0000-4000-8000-000000000002'});f.store.failPath='resources/'+second.entry.resourceId+'-v1.zip';await assert.rejects(f.model.saveBatch([first,second],{expectedEntries:[]}),/Write denied/);assert.equal(index(f.store).entries.length,0);f.store.failPath=null;await f.model.saveBatch([first,second],{expectedEntries:[]});await assert.rejects(f.model.saveBatch([],{expectedEntries:[]}),e=>e.messageKey==='folder.indexChanged');const result=await f.model.remove(id);assert.equal(result.complete,true);assert.equal(index(f.store).entries.length,1);assert.equal(f.store.files.has('resources/'+id+'-v1.zip'),false);
});

const thumbnail='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
test('deleting a resource removes all its versions and thumbnails while preserving unrelated files',async()=>{
 const f=await fixture([await record({thumbnail})]);await migrate(f);const second=await record({versionId:2,thumbnail});await f.model.save(second.entry,second.bytes,{update:true});const other=await record({resourceId:'b0000000-0000-4000-8000-000000000002',thumbnail});await f.model.save(other.entry,other.bytes);f.store.files.set('resources/notes.zip',new Uint8Array([9]));
 const result=await f.model.remove(id);assert.equal(result.complete,true);assert.equal(result.deleted.length,4);assert.equal([...f.store.files.keys()].some(path=>path.includes(id)),false);assert.equal((await f.model.entries())[0].resourceId,other.entry.resourceId);assert.deepEqual(await f.model.bundle(bundleKey(other.entry)),other.bytes);assert.ok(f.store.files.has('resources/notes.zip'));assert.ok(f.store.files.has('index.json'));
});
test('shared file references are protected even if their filename belongs to the deleted resource',async()=>{
 const f=await fixture([await record({thumbnail})]);await migrate(f);const other=await record({resourceId:'b0000000-0000-4000-8000-000000000002'});await f.model.save(other.entry,other.bytes);const changed=index(f.store),shared=changed.entries.find(e=>e.resourceId===id).thumbnail;changed.entries.find(e=>e.resourceId===other.entry.resourceId).thumbnail=shared;f.store.files.set('index.json',new TextEncoder().encode(JSON.stringify(changed)));
 await f.model.remove(id);assert.ok(f.store.files.has(shared));const plan=await f.model.scanUnused();assert.equal(plan.files.some(file=>file.path===shared),false);
});
test('an index failure deletes no files and partial disk failures expose an exact retry plan',async()=>{
 const f=await fixture([await record({thumbnail})]);await migrate(f);const before=structuredClone(f.store.files);f.store.failCommit=true;await assert.rejects(f.model.remove(id),/Index denied/);assert.deepEqual(f.store.files,before);f.store.failCommit=false;
 const path='resources/'+id+'-v1.zip';f.store.failRemove=path;const result=await f.model.remove(id);assert.equal(result.removed,true);assert.equal(result.complete,false);assert.equal(index(f.store).entries.length,0);assert.deepEqual(result.failed.map(item=>item.path),[path]);assert.equal(result.failed[0].messageKey,'folder.fileDeleteFailed');assert.ok(f.store.files.has(path));
 f.store.failRemove=null;const retried=await f.model.cleanFiles(result.plan.id);assert.equal(retried.complete,true);assert.equal(f.store.files.has(path),false);await assert.rejects(f.model.cleanFiles(result.plan.id),e=>e.messageKey==='folder.cleanupChanged');
});
test('orphan scans are read-only, show original resource names and ignore unrelated files',async()=>{
 const f=await fixture([await record({thumbnail})]);await migrate(f);const latest=await record({versionId:2,thumbnail});await f.model.save(latest.entry,latest.bytes,{update:true});const orphan=await record({resourceId:'c0000000-0000-4000-8000-000000000003'});f.store.files.set('resources/'+orphan.entry.resourceId+'-v1.zip',orphan.bytes);f.store.files.set('resources/notes.zip',new Uint8Array([1]));f.store.files.set('thumbnails/reference.png',new Uint8Array([2]));f.store.files.set('readme.txt',new Uint8Array([3]));const before=structuredClone(f.store.files),plan=await f.model.scanUnused();assert.deepEqual(f.store.files,before);assert.equal(plan.files.length,3);assert.ok(plan.files.some(file=>file.name==='测试图形'&&file.versionId===1));assert.equal(plan.files.some(file=>file.path==='resources/'+id+'-v2.zip'),false);
 const result=await f.model.cleanFiles(plan.id);assert.equal(result.complete,true);assert.equal(result.deleted.length,3);assert.equal(result.bytes,plan.bytes);assert.ok(f.store.files.has('resources/notes.zip'));assert.ok(f.store.files.has('thumbnails/reference.png'));assert.ok(f.store.files.has('readme.txt'));assert.deepEqual(await f.model.bundle(bundleKey(latest.entry)),latest.bytes);
});
test('changed files, changed indexes and switched libraries invalidate cleanup previews before deletion',async()=>{
 for(const change of ['file','index','binding']){const f=await fixture();await migrate(f);const later=await record({versionId:2});await f.model.save(later.entry,later.bytes,{update:true});const plan=await f.model.scanUnused(),path=plan.files[0].path;
  if(change==='file')f.store.files.set(path,new Uint8Array([7]));if(change==='index'){const changed=index(f.store);changed.name='Edited';f.store.files.set('index.json',new TextEncoder().encode(JSON.stringify(changed)));}if(change==='binding')await f.model.connect(f.other.handle);
  const before=structuredClone(f.store.files);await assert.rejects(f.model.cleanFiles(plan.id),e=>['folder.cleanupChanged','folder.destinationChanged'].includes(e.messageKey));assert.deepEqual(f.store.files,before);
 }
});
test('missing files, canceled cleanup and permission failures keep active resources safe',async()=>{
 const f=await fixture([await record({thumbnail})]);await migrate(f);const later=await record({versionId:2,thumbnail});await f.model.save(later.entry,later.bytes,{update:true});const plan=await f.model.scanUnused(),abort=new AbortController();f.store.files.delete(plan.files[0].path);const result=await f.model.cleanFiles(plan.id,{signal:abort.signal,onProgress:()=>abort.abort()});assert.equal(result.complete,false);assert.equal(result.failed.length,1);assert.deepEqual(await f.model.bundle(bundleKey(later.entry)),later.bytes);
 f.store.permission='prompt';await assert.rejects(f.model.cleanFiles(result.plan.id),e=>e.messageKey==='folder.permissionRequired');f.store.permission='granted';assert.equal((await f.model.cleanFiles(result.plan.id)).complete,true);
});
test('cleanup cannot delete a file that became referenced after the scan',async()=>{
 const f=await fixture();await migrate(f);const later=await record({versionId:2});await f.model.save(later.entry,later.bytes,{update:true});const plan=await f.model.scanUnused(),changed=index(f.store);changed.entries[0].file=plan.files[0].path;f.store.files.set('index.json',new TextEncoder().encode(JSON.stringify(changed)));const before=structuredClone(f.store.files);await assert.rejects(f.model.cleanFiles(plan.id),e=>e.messageKey==='folder.cleanupChanged');assert.deepEqual(f.store.files,before);
});

test('file references with different casing and stale library identities cannot be deleted',async()=>{
 const f=await fixture([await record({thumbnail})]);await migrate(f);const other=await record({resourceId:'b0000000-0000-4000-8000-000000000002'});await f.model.save(other.entry,other.bytes);const changed=index(f.store),shared=changed.entries.find(e=>e.resourceId===id).thumbnail;changed.entries.find(e=>e.resourceId===other.entry.resourceId).thumbnail=shared.replace(id,id.toUpperCase());f.store.files.set('index.json',new TextEncoder().encode(JSON.stringify(changed)));
 await assert.rejects(f.model.remove(id,{expectedLibraryId:'wrong-library'}),e=>e.messageKey==='folder.destinationChanged');await f.model.remove(id);assert.ok(f.store.files.has(shared));assert.equal((await f.model.scanUnused()).files.some(file=>file.path===shared),false);
});
test('corrupt source packages, hashes and missing shader dependencies stop migration before cleanup',async()=>{
 const root=node('shape','Circle');root.postEffects.pixelate.enabled=true;const meta=(await record()).entry,bytes=await encodeResourcePack({schema:PRESET_SCHEMA,root,graphicResource:meta}),files=await decodeZIP(bytes),shader=[...files.keys()].find(path=>path.startsWith('engine-shaders/effects/pixelate/'));assert.ok(shader);files.delete(shader);const broken=encodeZIP([...files].map(([name,data])=>({name,data})));
 for(const entry of [{entry:meta,bytes:new Uint8Array([1])},{entry:{...meta,hash:await bytesHash(broken)},bytes:broken}]){const f=await fixture([entry]);await f.model.connect(f.store.handle);await assert.rejects(f.model.importBrowserResources());assert.equal(f.browser.length,1);assert.equal(index(f.store).entries.length,0);}
});
test('portable resource validation still accepts more than 256 declared dependencies',async()=>{
 const meta=(await record()).entry,asset=builtinAsset('Circle'),assets=Array.from({length:257},(_,i)=>[i?'extra_'+i:'Circle',asset]),bytes=await encodeResourcePack({schema:PRESET_SCHEMA,root:node('shape','Circle'),graphicResource:meta},{assets}),f=await fixture([{entry:{...meta,hash:await bytesHash(bytes)},bytes}]);await migrate(f);assert.equal((await f.model.entries()).length,1);assert.equal(f.browser.length,0);
});
