import {normalizeGraphicAliases} from './graphic-name.js';
export async function bytesHash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
const DB='momo-graphics-library-v1';
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('entries',{keyPath:'resourceId'});r.result.createObjectStore('bundles');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction(mode,run){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(['entries','bundles'],mode);let result,failure;tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure??tx.error??Error('图形库保存失败'));tx.onerror=()=>reject(tx.error);run(tx,v=>result=v,message=>{failure=Error(message);tx.abort();});});}finally{db.close();}}
export const libraryEntries=()=>transaction('readonly',(tx,done)=>{const r=tx.objectStore('entries').getAll();r.onsuccess=()=>done(r.result);});
export const bundleKey=entry=>entry.resourceId+'@'+entry.versionId;
export const libraryBundle=id=>transaction('readonly',(tx,done)=>{const r=tx.objectStore('bundles').get(id);r.onsuccess=()=>done(r.result);});
export function libraryIdentity(input={}){return {resourceId:input.resourceId??crypto.randomUUID(),versionId:input.versionId??1,personalRevision:0};}
export function validateEntry(e){normalizeGraphicAliases(e?.aliases);if(!e||!(typeof e.resourceId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.resourceId))||!Number.isSafeInteger(e.versionId)||e.versionId<1||e.personalRevision!==0||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||!['formula','image','composition'].includes(e.kind))throw Error('图形库资源信息无效');if(e.thumbnail&&(!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(e.thumbnail)||e.thumbnail.length>2000000))throw Error('缩略图无效');if(e.category?.length>80||e.description?.length>2000)throw Error('资源说明过长');return e;}
export async function saveLibraryEntry(meta,bytes,{update=false,expectedLocal=null}={}){
 validateEntry(meta);if(!(bytes instanceof Uint8Array)||bytes.length>64*1024*1024)throw Error('资源包无效或超过64MB');
 const hash=await bytesHash(bytes),entry={...meta,hash,updatedAt:new Date().toISOString()};
 return transaction('readwrite',(tx,done,fail)=>{const store=tx.objectStore('entries'),r=store.get(entry.resourceId);r.onsuccess=()=>{const old=r.result;if(expectedLocal&&(!old||old.versionId!==expectedLocal.versionId||old.hash!==expectedLocal.hash||entry.versionId<=old.versionId)){fail('本地图形已改变，请刷新后再更新');return;}if(old&&old.versionId===entry.versionId&&old.hash!==hash){fail('相同资源ID和版本的内容不同，请另存为新资源');return;}if(old&&old.versionId!==entry.versionId&&(!update||!expectedLocal&&entry.versionId!==old.versionId+1)){fail('库中版本已改变，请重新加载或另存为新资源');return;}if(old)tx.objectStore('bundles').delete(bundleKey(old));store.put(entry);tx.objectStore('bundles').put(bytes,bundleKey(entry));done(entry);};});
}
export const deleteLibraryEntry=(id,{expectedLocal=null}={})=>transaction('readwrite',(tx,done,fail)=>{const r=tx.objectStore('entries').get(id);r.onsuccess=()=>{const old=r.result;if(expectedLocal&&(!old||old.versionId!==expectedLocal.versionId||old.hash!==expectedLocal.hash)){fail('本地图形已改变，请刷新后再删除');return;}if(old){tx.objectStore('bundles').delete(bundleKey(old));tx.objectStore('entries').delete(id);}done();};});

export async function builtinIdentity(name){const h=await bytesHash(new TextEncoder().encode('momo-texture-builtin:'+name));return h.slice(0,8)+'-'+h.slice(8,12)+'-8'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);}

// Import prepared resources together; a conflict aborts the entire batch.
export async function saveLibraryBatch(records,{expectedEntries,isActive=()=>true}={}){
 if(!Array.isArray(records)||records.length>1000||!Array.isArray(expectedEntries))throw Error('Invalid library import batch');
 let total=0;const ids=new Set(),prepared=[];
 for(const {entry,bytes}of records){validateEntry(entry);if(ids.has(entry.resourceId))throw Error('Duplicate resource identity in import');ids.add(entry.resourceId);if(!(bytes instanceof Uint8Array)||(total+=bytes.length)>64*1024*1024)throw Error('Library import exceeds 64 MiB');prepared.push({entry:{...entry,hash:await bytesHash(bytes),updatedAt:new Date().toISOString()},bytes});}
 return transaction('readwrite',(tx,done,fail)=>{const store=tx.objectStore('entries'),request=store.getAll();request.onsuccess=()=>{
  if(!isActive()){fail('Import expired');return;}
  const actual=request.result;if(actual.length!==expectedEntries.length||actual.some(e=>!expectedEntries.some(old=>old.resourceId===e.resourceId&&old.versionId===e.versionId&&old.hash===e.hash))){fail('Library changed during import');return;}
  if(prepared.some(({entry})=>actual.some(e=>e.resourceId===entry.resourceId))){fail('Resource already exists; choose a separate copy');return;}
  for(const {entry,bytes}of prepared){store.put(entry);tx.objectStore('bundles').put(bytes,bundleKey(entry));}done(prepared.map(r=>r.entry));
 }});
}
