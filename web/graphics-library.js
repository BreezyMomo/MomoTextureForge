import {normalizeGraphicAliases} from './graphic-name.js';
import {messageError} from './message-catalog.js';
import {libraryChanged} from './library-events.js';
export async function bytesHash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
const DB='momo-graphics-library-v1';
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,2);r.onupgradeneeded=()=>{for(const [name,options]of [['entries',{keyPath:'resourceId'}],['bundles',undefined]])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,options);};r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(messageError('folder.closeOldWindows'));});}
async function transaction(mode,run){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(['entries','bundles'],mode);let result,failure;tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure??tx.error??Error('图形库保存失败'));tx.onerror=()=>reject(tx.error);run(tx,v=>result=v,message=>{failure=message instanceof Error?message:Error(message);tx.abort();});});}finally{db.close();}}
export const browserLibraryEntries=()=>transaction('readonly',(tx,done)=>{const r=tx.objectStore('entries').getAll();r.onsuccess=()=>done(r.result);});
export const bundleKey=entry=>entry.resourceId+'@'+entry.versionId;
export const browserLibraryBundle=id=>transaction('readonly',(tx,done)=>{const r=tx.objectStore('bundles').get(id);r.onsuccess=()=>done(r.result);});

// Capture metadata and active bundles in one transaction, never mixing versions.
export async function browserLibrarySnapshot(){
 const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(['entries','bundles']),request=tx.objectStore('entries').getAll();let result;tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error);request.onsuccess=()=>{const entries=request.result,records=entries.map(entry=>({entry,bytes:null}));for(const record of records){const r=tx.objectStore('bundles').get(bundleKey(record.entry));r.onsuccess=()=>record.bytes=r.result??null;}result={entries,records};};});}finally{db.close();}
}
// Upgrade-only access includes copies left by the unreleased backup workflow.
// Every package moves to disk before these obsolete stores are cleared.
async function legacyTransaction({bundles=false,clear}={}){
 const db=await open();try{return await new Promise((resolve,reject)=>{
  const stores=['entries','bundles',...['backups','backup-bundles'].filter(name=>db.objectStoreNames.contains(name))],tx=db.transaction(stores,clear?'readwrite':'readonly');let active,archives,result,failure;
  tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(failure??Object.assign(messageError('folder.legacyStorageFailed'),{cause:tx.error}));
  const collect=()=>{if(!active||!archives)return;try{
   const records=new Map(),add=(entry,store,key)=>{const id=entry.resourceId+'@'+entry.versionId+'@'+entry.hash;if(!records.has(id))records.set(id,{entry,store,key});};
   for(const entry of active)add(entry,'bundles',bundleKey(entry));
   for(const archive of archives){if(!Array.isArray(archive.entries))throw messageError('folder.legacyStorageFailed');for(const entry of archive.entries)add(entry,'backup-bundles',entry.hash);}
   const ordered=[...records.values()].sort((a,b)=>a.entry.resourceId.localeCompare(b.entry.resourceId)||a.entry.versionId-b.entry.versionId||String(a.entry.hash).localeCompare(String(b.entry.hash))),entries=ordered.map(r=>r.entry);
   if(clear){if(JSON.stringify(entries)!==JSON.stringify(clear))throw messageError('folder.browserChanged');for(const name of stores)tx.objectStore(name).clear();result=undefined;return;}
   if(!bundles){result=entries;return;}
   result={entries,records:ordered.map(({entry})=>({entry,bytes:null}))};for(let i=0;i<ordered.length;i++){const item=ordered[i];if(!stores.includes(item.store))throw messageError('folder.legacyStorageFailed');const r=tx.objectStore(item.store).get(item.key);r.onsuccess=()=>result.records[i].bytes=r.result??null;}
  }catch(error){failure=error;tx.abort();}};
  const r=tx.objectStore('entries').getAll();r.onsuccess=()=>{active=r.result;collect();};
  if(stores.includes('backups')){const r=tx.objectStore('backups').getAll();r.onsuccess=()=>{archives=r.result;collect();};}else archives=[];
 });}finally{db.close();}
}
export const browserLegacyEntries=()=>legacyTransaction();
export const browserLegacySnapshot=()=>legacyTransaction({bundles:true});
export const clearBrowserLibrary=expectedEntries=>legacyTransaction({clear:expectedEntries});
export function libraryIdentity(input={}){return {resourceId:input.resourceId??crypto.randomUUID(),versionId:input.versionId??1,personalRevision:0};}
export function validateEntry(e){normalizeGraphicAliases(e?.aliases);if(!e||!(typeof e.resourceId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.resourceId))||!Number.isSafeInteger(e.versionId)||e.versionId<1||e.personalRevision!==0||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||!['formula','image','composition'].includes(e.kind))throw Error('图形库资源信息无效');if(e.thumbnail&&(!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(e.thumbnail)||e.thumbnail.length>2000000))throw Error('缩略图无效');if(e.category?.length>80||e.description?.length>2000)throw Error('资源说明过长');return e;}
export async function browserSaveLibraryEntry(meta,bytes,{update=false,expectedLocal=null}={}){
 validateEntry(meta);if(!(bytes instanceof Uint8Array)||bytes.length>64*1024*1024)throw Error('资源包无效或超过64MB');
 const hash=await bytesHash(bytes),entry={...meta,hash,updatedAt:new Date().toISOString()};
 return transaction('readwrite',(tx,done,fail)=>{const store=tx.objectStore('entries'),r=store.get(entry.resourceId);r.onsuccess=()=>{const old=r.result;if(expectedLocal&&(!old||old.versionId!==expectedLocal.versionId||old.hash!==expectedLocal.hash||entry.versionId<=old.versionId)){fail('本地图形已改变，请刷新后再更新');return;}if(old&&old.versionId===entry.versionId&&old.hash!==hash){fail('相同资源ID和版本的内容不同，请另存为新资源');return;}if(old&&old.versionId!==entry.versionId&&(!update||!expectedLocal&&entry.versionId!==old.versionId+1)){fail('库中版本已改变，请重新加载或另存为新资源');return;}if(old)tx.objectStore('bundles').delete(bundleKey(old));store.put(entry);tx.objectStore('bundles').put(bytes,bundleKey(entry));done(entry);};});
}
export const browserDeleteLibraryEntry=(id,{expectedLocal=null}={})=>transaction('readwrite',(tx,done,fail)=>{const r=tx.objectStore('entries').get(id);r.onsuccess=()=>{const old=r.result;if(expectedLocal&&(!old||old.versionId!==expectedLocal.versionId||old.hash!==expectedLocal.hash)){fail('本地图形已改变，请刷新后再删除');return;}if(old){tx.objectStore('bundles').delete(bundleKey(old));tx.objectStore('entries').delete(id);}done();};});

export async function builtinIdentity(name){const h=await bytesHash(new TextEncoder().encode('momo-texture-builtin:'+name));return h.slice(0,8)+'-'+h.slice(8,12)+'-8'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);}

// Import prepared resources together; a conflict aborts the entire batch.
export async function browserSaveLibraryBatch(records,{expectedEntries,isActive=()=>true}={}){
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

// Only the opened folder supplies personal resources. Browser records are read
// solely by the explicit one-time legacy importer; they are never a fallback.
const folder=()=>import('./folder-library.js');
export async function libraryEntries(){return (await folder()).folderLibrary.entries();}
export async function libraryBundle(id){return (await folder()).folderLibrary.bundle(id);}
async function writeToLibrary(method,args){const {folderLibrary,withLibraryTarget}=await folder();const result=await withLibraryTarget(async()=>{const binding=await folderLibrary.binding(),options=args.at(-1);if(options&&Object.hasOwn(options,'expectedDestination')&&options.expectedDestination!==(binding?.token??null))throw messageError('folder.destinationChanged');if(!binding)throw messageError('folder.notConnected');return folderLibrary[method](...args);});libraryChanged();return result;}
export const saveLibraryEntry=(...args)=>writeToLibrary('save',args);
export const saveLibraryBatch=(...args)=>writeToLibrary('saveBatch',args);
export const deleteLibraryEntry=(...args)=>writeToLibrary('remove',args);
