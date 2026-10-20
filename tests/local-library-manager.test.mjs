import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalLibrary} from '../library-manager/model.mjs';
import {safeLibraryPath,BrowserDirectoryStore} from '../library-manager/storage.mjs';
import {bytesHash} from '../web/graphics-library.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {decodeZIP} from '../web/resource-zip.js';
import {encodeZIP} from '../web/encoders.js';
import {node,PRESET_SCHEMA} from '../web/tree-model.js';
const id='a0000000-0000-4000-8000-000000000001';
const pack=(version=1,name='测试花')=>encodeResourcePack({schema:PRESET_SCHEMA,name,root:node('shape','Circle'),graphicResource:{resourceId:id,versionId:version,personalRevision:0,name,category:'花纹',description:'',kind:'formula',thumbnail:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='}});
class MemoryStore {
 constructor(){this.name='selected-folder';this.files=new Map();this.queue=Promise.resolve();}
 async read(path){safeLibraryPath(path);return this.files.has(path)?this.files.get(path).slice():null;}
 async immutable(path,bytes){const old=await this.read(path);if(old!==null){if(await bytesHash(old)!==await bytesHash(bytes))throw Error('文件冲突');return false;}this.files.set(path,bytes.slice());return true;}
 async commitIndex(bytes,check){await check(await this.read('index.json'));if(this.failCommit)throw Error('write denied');this.files.set('index.json',bytes.slice());}
 async rollback(path){safeLibraryPath(path);this.files.delete(path);}
 async removeFile(path){safeLibraryPath(path);if(this.failDelete===path)throw Error('delete denied');return this.files.delete(path);}
 lock(id,fn){const operation=this.queue.then(fn);this.queue=operation.catch(()=>{});return operation;}
}
class MemorySnapshots {
 constructor(){this.rows=[];}
 async add(index,reason){if(this.fail)throw Error('snapshot denied');this.rows.push({id:crypto.randomUUID(),index:structuredClone(index),reason,time:new Date().toISOString()});}
 async list(id){return this.rows.filter(s=>s.index.libraryId===id).map(s=>({...s,count:s.index.entries.length})).reverse();}
 async get(id){return this.rows.find(s=>s.id===id);}
}
async function fixture(){const store=new MemoryStore(),history=new MemorySnapshots();return {store,history,m:await LocalLibrary.open(store,history)};}
async function seed(m,bytes){const {revision}=await m.load(),p=await m.preview([bytes??await pack()],revision);return m.apply(p.id,revision);}
test('static manager preview, metadata, repeat import, withdrawal and recovery preserve package bytes',async()=>{
 const {m,store}=await fixture(),bytes=await pack(),p=await m.preview([bytes],'missing');assert.equal((await m.load()).index.entries.length,0);let s=await m.apply(p.id,'missing');const path=s.index.entries[0].file;
 s=await m.edit(id,{name:'别名',category:'分类',description:'说明',tags:['花']},s.revision);assert.deepEqual(await store.read(path),bytes);
 const repeat=await m.preview([bytes],s.revision);assert.equal(repeat.changes.length,0);s=await m.apply(repeat.id,s.revision);assert.equal(s.index.entries[0].name,'别名');s=await m.remove([id],s.revision);assert.equal(s.index.entries.length,0);assert.ok(await store.read(path));const backup=(await m.history()).find(s=>s.reason.startsWith('移出目录'));s=await m.restore(backup.id,s.revision);assert.equal(s.index.entries[0].name,'别名');
});
test('stale plans, immutable versions including withdrawn files, and corrupt dependency content are rejected',async()=>{
 const {m,store}=await fixture();let s=await seed(m),before=await store.read('index.json');await assert.rejects(m.preview([await pack(1,'不同')],s.revision),/相同资源ID和版本/);assert.deepEqual(await store.read('index.json'),before);
 const pending=await m.preview([await pack(3)],s.revision);await m.rename('new name',s.revision);await assert.rejects(m.apply(pending.id,s.revision),/失效|修改/);s=await m.load();s=await m.remove([id],s.revision);await assert.rejects(m.preview([await pack(1,'另一份')],s.revision),/已有版本文件内容不同/);
 const files=await decodeZIP(await pack(2));files.set([...files.keys()].find(k=>k.endsWith('.glsl')),new TextEncoder().encode('modified'));await assert.rejects(m.preview([encodeZIP([...files].map(([name,data])=>({name,data})))],s.revision),/校验失败/);
});
test('failed index commit or snapshot persistence preserves prior index and cleans newly created packages',async()=>{
 const {m,store,history}=await fixture();let s=await seed(m),before=await store.read('index.json'),p=await m.preview([await pack(3)],s.revision);store.failCommit=true;await assert.rejects(m.apply(p.id,s.revision),/write denied/);assert.deepEqual(await store.read('index.json'),before);assert.equal(await store.read('resources/'+id+'-v3.zip'),null);
 store.failCommit=false;history.fail=true;await assert.rejects(m.rename('changed',s.revision),/snapshot denied/);assert.deepEqual(await store.read('index.json'),before);
});
test('same-store concurrent writers serialize and only the first revision succeeds',async()=>{
 const {m,store,history}=await fixture(),s=await seed(m),other=await LocalLibrary.open(store,history);const result=await Promise.allSettled([m.rename('first',s.revision),other.rename('second',s.revision)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal((await m.load()).index.name,'first');
});
test('JSON restore rejects foreign identities and missing package bytes; paths cannot reach credentials or .git',async()=>{
 const {m,store}=await fixture(),s=await seed(m);await assert.rejects(m.restoreIndex({...s.index,libraryId:crypto.randomUUID()},s.revision),/不属于/);store.files.delete(s.index.entries[0].file);await assert.rejects(m.restoreIndex(s.index,s.revision),/缺失或已改变/);
 for(const path of ['../outside','.git/config','resources/../index.json','C:/x','resources/%2e%2e/a.zip','https://host/a.zip','manager/index.html'])assert.throws(()=>safeLibraryPath(path));
 const denied=new BrowserDirectoryStore({kind:'directory',name:'denied',queryPermission:async()=>'denied'});await assert.rejects(denied.permission(),/权限已失效/);
});

test('permanent deletion removes referenced files, preserves historical files, and cannot restore deleted packages',async()=>{
 const {m,store,history}=await fixture();let s=await seed(m);const old=s.index.entries[0].file;s=await seed(m,await pack(2));const entry=s.index.entries[0];store.files.set('thumbnails/unused.png',new Uint8Array([1]));
 s=await m.deletePermanently([id],s.revision);assert.equal(s.index.entries.length,0);assert.equal(await store.read(entry.file),null);assert.equal(await store.read(entry.thumbnail),null);assert.ok(await store.read(old));assert.ok(await store.read('thumbnails/unused.png'));assert.equal(s.cleanup.failed.length,0);
 const backup=history.rows.findLast(r=>r.reason.startsWith('彻底删除'));await assert.rejects(m.restore(backup.id,s.revision),/缺失或已改变/);
});

test('permanent deletion protects shared files, rejects stale/unknown selections, and never deletes before index commit',async()=>{
 const {m,store,history}=await fixture();let s=await seed(m);const entry=s.index.entries[0],other=crypto.randomUUID(),shared=structuredClone(s.index);shared.entries.push({...entry,resourceId:other});s=await m.save(shared,s.revision,'shared fixture');
 await assert.rejects(m.deletePermanently([crypto.randomUUID()],s.revision),/不在目录/);await assert.rejects(m.deletePermanently([id],'stale'),/修改/);store.failCommit=true;await assert.rejects(m.deletePermanently([id],s.revision),/write denied/);assert.ok(await store.read(entry.file));assert.ok(await store.read(entry.thumbnail));store.failCommit=false;
 history.fail=true;await assert.rejects(m.deletePermanently([id],s.revision),/snapshot denied/);history.fail=false;
 s=await m.deletePermanently([id],s.revision);assert.equal(s.index.entries.length,1);assert.ok(await store.read(entry.file));assert.ok(await store.read(entry.thumbnail));assert.equal(s.cleanup.shared.length,2);assert.equal(s.cleanup.removed.length,0);
});

test('permanent deletion reports partial cleanup and treats missing files as already absent',async()=>{
 const {m,store}=await fixture();let s=await seed(m);const entry=s.index.entries[0];store.failDelete=entry.file;store.files.delete(entry.thumbnail);s=await m.deletePermanently([id],s.revision);
 assert.equal(s.index.entries.length,0);assert.deepEqual(s.cleanup.failed,[{path:entry.file,message:'delete denied'}]);assert.deepEqual(s.cleanup.missing,[entry.thumbnail]);assert.ok(await store.read(entry.file));
 const missing=new BrowserDirectoryStore({kind:'directory',name:'missing',getDirectoryHandle:async()=>{throw Object.assign(Error('missing'),{name:'NotFoundError'});}});assert.equal(await missing.removeFile('resources/gone.zip'),false);await assert.rejects(missing.removeFile('index.json'),/不能删除/);await assert.rejects(missing.removeFile('../outside'),/不允许/);
});
