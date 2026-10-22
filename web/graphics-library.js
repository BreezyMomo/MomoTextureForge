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
export const deleteLibraryEntry=id=>transaction('readwrite',(tx,done)=>{const r=tx.objectStore('entries').get(id);r.onsuccess=()=>{if(r.result){tx.objectStore('bundles').delete(bundleKey(r.result));tx.objectStore('entries').delete(id);}done();};});

export async function builtinIdentity(name){const h=await bytesHash(new TextEncoder().encode('momo-texture-builtin:'+name));return h.slice(0,8)+'-'+h.slice(8,12)+'-8'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);}
