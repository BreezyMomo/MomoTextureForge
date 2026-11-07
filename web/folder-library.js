import {BrowserDirectoryStore,safeLibraryPath} from './library-directory-store.js';
import {bytesHash,validateEntry,bundleKey} from './graphics-library.js';
import {validateRemoteIndex,REMOTE_SCHEMA} from './remote-library-model.js';
import {validatePortablePack} from './portable-resource-validation.js';
import {messageError,serializeMessageError} from './message-catalog.js';
import {managedLibraryFile,referencedLibraryFiles,inspectLibraryFiles} from './library-file-cleanup.js';
import {libraryChanged} from './library-events.js';
import {legacyLibraryEntries,legacyLibrarySnapshot,clearLegacyLibrary} from './legacy-library-upgrade.js';
import {invalidateRemoteDownload} from './remote-library-storage.js';

const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const hash=bytes=>bytes===null?Promise.resolve('missing'):bytesHash(bytes);
let queue=Promise.resolve();
// Serializes changes of destination with writes, including other editor tabs.
export function withLibraryTarget(run){
 const operation=queue.then(()=>globalThis.navigator?.locks?navigator.locks.request('momo-texture-library-target',run):run());
 queue=operation.catch(()=>{});return operation;
}
export class FolderPreferences {
 async access(write,value,key='active'){
  const db=await new Promise((ok,no)=>{const r=indexedDB.open('momo-folder-library-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();ok(r.result);};r.onerror=()=>no(r.error);});
  try{return await new Promise((ok,no)=>{const tx=db.transaction('settings',write?'readwrite':'readonly'),store=tx.objectStore('settings');let result;tx.oncomplete=()=>ok(result);tx.onabort=tx.onerror=()=>no(tx.error);if(write){if(value)store.put(value,key);else store.delete(key);}else{const r=store.get(key);r.onsuccess=()=>result=r.result??null;}});}finally{db.close();}
 }
 get(){return this.access(false);}
 set(value){return this.access(true,value);}
}
export class FolderLibrary {
 constructor({preferences=new FolderPreferences(),store=handle=>new BrowserDirectoryStore(handle),readBrowser=legacyLibraryEntries,readBrowserSnapshot=legacyLibrarySnapshot,clearBrowser=clearLegacyLibrary,invalidateRemote=invalidateRemoteDownload}={}){
  Object.assign(this,{preferences,store,readBrowser,readBrowserSnapshot,clearBrowser,invalidateRemote});this.cache=new Map();this.cleanupPlans=new Map();
 }
 async binding(){return this.preferences.get();}
 async permission(handle){if(handle?.queryPermission&&await handle.queryPermission({mode:'readwrite'})!=='granted')throw messageError('folder.permissionRequired');}
 async load(handle,libraryId=null){
  const store=this.store(handle),raw=await store.read('index.json');
  if(raw===null){if(libraryId)throw messageError('folder.indexMissing');return {index:{schema:REMOTE_SCHEMA,libraryId:crypto.randomUUID(),name:handle.name,entries:[]},revision:'missing'};}
  let index;try{index=JSON.parse(decoder.decode(raw));validateRemoteIndex(index,'https://library.invalid/index.json');for(const entry of index.entries){safeLibraryPath(entry.file);if(entry.thumbnail&&!entry.thumbnail.startsWith('data:'))safeLibraryPath(entry.thumbnail);}}catch(cause){throw Object.assign(messageError('folder.invalidIndex'),{cause});}
  if(libraryId&&index.libraryId!==libraryId)throw messageError('folder.identityChanged');
  return {index,revision:await hash(raw)};
 }
 async inspect(handle){await this.permission(handle);return this.load(handle);}
 async metadata(binding,state){
  const previous=this.cache.get(binding.token);if(previous?.revision===state.revision)return previous.entries;
  const store=this.store(binding.handle),entries=[];
  for(const entry of state.index.entries){
   let thumbnail=entry.thumbnail??'';
   if(thumbnail&&!thumbnail.startsWith('data:')){try{const bytes=await store.read(thumbnail);if(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));thumbnail='data:image/'+(thumbnail.endsWith('.webp')?'webp':'png')+';base64,'+btoa(text);}else thumbnail='';}catch{thumbnail='';}}
   entries.push({...entry,thumbnail,hash:entry.sha256,personalRevision:0,folder:true,libraryId:state.index.libraryId,sourceName:state.index.name});
  }
  this.cache.set(binding.token,{revision:state.revision,entries});return entries;
 }
 async status(){
  const binding=await this.binding();if(!binding)return {mode:'none',entries:[]};
  try{await this.permission(binding.handle);const state=await this.load(binding.handle,binding.libraryId);return {mode:'folder',state:'ready',binding,index:state.index,entries:await this.metadata(binding,state)};}
  catch(error){return {mode:'folder',state:error.messageKey==='folder.permissionRequired'?'permission':'unavailable',binding,entries:this.cache.get(binding.token)?.entries??binding.entries??[],error};}
 }
 async entries(){const state=await this.status();return (state.entries??[]).map(entry=>({...entry,available:state.state==='ready'}));}
 async connected(){const binding=await this.binding();if(!binding)throw messageError('folder.notConnected');await this.permission(binding.handle);return {binding,...await this.load(binding.handle,binding.libraryId)};}
 async verify(bytes,entry){
  try{
   if(!(bytes instanceof Uint8Array)||bytes.length>64*1024*1024)throw Error('Invalid resource bytes');
   const {payload}=await validatePortablePack(bytes),meta=payload.graphicResource;validateEntry(meta);
   if(payload.schema!=='momo.texture-subtree/v1'||meta.resourceId!==entry.resourceId||meta.versionId!==entry.versionId||meta.kind!==entry.kind)throw Error('Resource identity mismatch');
   return meta;
  }catch(cause){throw Object.assign(messageError('folder.invalidResource',entry.name),{cause});}
 }
 async bundle(key){
  const {binding,index}=await this.connected(),entry=index.entries.find(e=>bundleKey(e)===key);if(!entry)throw messageError('folder.resourceMissing');
  const bytes=await this.store(binding.handle).read(entry.file);if(!bytes||await bytesHash(bytes)!==entry.sha256)throw messageError('folder.resourceChanged',entry.name);
  await this.verify(bytes,entry);return bytes;
 }
 async commit(store,state,index){
  // Resource files are immutable and verified first. Publish the directory last.
  validateRemoteIndex(index,'https://library.invalid/index.json');
  const bytes=encoder.encode(JSON.stringify(index,null,2)+'\n');if(bytes.length>8*1024*1024)throw messageError('folder.fileTooLarge','index.json');
  await store.commitIndex(bytes,async current=>{if(await hash(current)!==state.revision)throw messageError('folder.indexChanged');});
  const actual=await store.read('index.json');if(!actual||await hash(actual)!==await hash(bytes))throw messageError('folder.indexVerificationFailed');
  return {index,revision:await hash(bytes)};
 }
 async writeRecord(store,index,entry,bytes){
  validateEntry(entry);const meta=await this.verify(bytes,entry),sha256=await bytesHash(bytes),old=index.entries.find(e=>e.resourceId===entry.resourceId);
  if(old&&(old.versionId>entry.versionId||old.versionId===entry.versionId&&old.sha256!==sha256))throw messageError('folder.versionConflict',entry.name);
  const file=old?.versionId===entry.versionId?old.file:'resources/'+entry.resourceId+'-v'+entry.versionId+'.zip';
  await store.immutable(file,bytes);const written=await store.read(file);if(!written||await bytesHash(written)!==sha256)throw messageError('folder.resourceChanged',entry.name);
  if(old?.versionId===entry.versionId)return {entry:old,reused:true};
  let thumbnail='';const preview=entry.thumbnail||meta.thumbnail;if(preview){const match=/^data:image\/(png|webp);base64,(.+)$/.exec(preview);thumbnail='thumbnails/'+entry.resourceId+'-v'+entry.versionId+'.'+match[1];const pixels=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));await store.immutable(thumbnail,pixels);const written=await store.read(thumbnail);if(!written||await bytesHash(written)!==await bytesHash(pixels))throw messageError('folder.resourceChanged',entry.name);}
  const next={resourceId:entry.resourceId,versionId:entry.versionId,name:entry.name,aliases:entry.aliases??{},kind:entry.kind,category:entry.category??'',description:entry.description??'',...(entry.generator||meta.generator?{generator:true}:{}),...(typeof entry.animated==='boolean'?{animated:entry.animated}:{}),...(entry.source?{source:entry.source}:{}),...(entry.remoteOrigin?{remoteOrigin:entry.remoteOrigin}:{}),...(entry.imageMime?{imageMime:entry.imageMime}:{}),...(entry.legacyFingerprint?{legacyFingerprint:entry.legacyFingerprint}:{}),file,sha256,thumbnail,tags:entry.tags??[]};
  index.entries=index.entries.filter(e=>e.resourceId!==entry.resourceId);index.entries.push(next);return {entry:next,reused:false};
 }
 async connect(handle,{name=handle.name,signal}={}){
  return withLibraryTarget(async()=>{
   await this.permission(handle);const store=this.store(handle),initial=await this.load(handle);
   if(typeof name!=='string'||!name.trim()||name.length>80)throw messageError('folder.invalidName');
   const check=()=>{if(signal?.aborted)throw messageError('folder.canceled');};
   const state=await store.lock(initial.index.libraryId,async()=>{
    check();const latest=await this.load(handle);if(latest.revision!==initial.revision)throw messageError('folder.indexChanged');
    if(latest.revision!=='missing')return latest;
    latest.index.name=name.trim();return this.commit(store,latest,latest.index);
   });
   check();const binding={token:crypto.randomUUID(),handle,libraryId:state.index.libraryId,name:state.index.name,folderName:handle.name,connectedAt:new Date().toISOString()};binding.entries=await this.metadata(binding,state);
   await this.preferences.set(binding);this.cache.clear();this.cache.set(binding.token,{revision:state.revision,entries:binding.entries});libraryChanged();return {total:state.index.entries.length,binding};
  });
 }
 async disconnect(){return withLibraryTarget(async()=>{await this.preferences.set(null);this.cache.clear();libraryChanged();});}
 async legacyFingerprint(entries){return bytesHash(encoder.encode(JSON.stringify([...entries].sort((a,b)=>a.resourceId.localeCompare(b.resourceId)).map(({resourceId,versionId,hash})=>[resourceId,versionId,hash]))));}
 async legacyBrowserStatus(){
  return {count:(await this.readBrowser()).length};
 }
 // An explicit upgrade action, independent of opening or switching folders.
 // Delete browser originals only after every exact package is verified on disk.
 async importBrowserResources({signal,onProgress=()=>{},onPhase=()=>{}}={}){
  return withLibraryTarget(async()=>{
   const {binding,index}=await this.connected(),snapshot=await this.readBrowserSnapshot(),fingerprint=await this.legacyFingerprint(snapshot.entries);
   if(!snapshot.records.length)return {copied:0,reused:0,total:0};
   const check=()=>{if(signal?.aborted)throw messageError('folder.canceled');};let copied=0,reused=0;
   for(const {entry,bytes}of snapshot.records){check();if(!bytes||await bytesHash(bytes)!==entry.hash)throw messageError('folder.resourceChanged',entry.name);await this.verify(bytes,entry);}
   const store=this.store(binding.handle);
   await store.lock(index.libraryId,async()=>{
    const state=await this.load(binding.handle,binding.libraryId);
    const files=[];
    for(const {entry,bytes}of snapshot.records){check();const old=state.index.entries.find(e=>e.resourceId===entry.resourceId);let file;
     if(old?.versionId>entry.versionId){file='resources/'+entry.resourceId+'-v'+entry.versionId+'.zip';await store.immutable(file,bytes);reused++;}
     else{const result=await this.writeRecord(store,state.index,entry,bytes);file=result.entry.file;result.reused?reused++:copied++;}
     files.push({file,entry});onProgress({done:copied+reused,total:snapshot.records.length,name:entry.name});
    }
    check();if(await this.legacyFingerprint(await this.readBrowser())!==fingerprint)throw messageError('folder.browserChanged');
    onPhase('publishing');check();const final=copied?await this.commit(store,state,state.index):state;await this.remember(binding,final);
    onPhase('verifying');check();
    for(const {file,entry}of files){check();const bytes=await store.read(file);if(!bytes||await bytesHash(bytes)!==entry.hash)throw messageError('folder.resourceChanged',entry.name);await this.verify(bytes,entry);}
    check();if((await this.load(binding.handle,binding.libraryId)).revision!==final.revision)throw messageError('folder.indexChanged');
    onPhase('cleaning');check();await this.clearBrowser(snapshot);
   });
   libraryChanged();return {copied,reused,total:snapshot.records.length};
  });
 }
 async resume(){const binding=await this.binding();if(!binding)throw messageError('folder.notConnected');if(binding.handle.requestPermission&&await binding.handle.requestPermission({mode:'readwrite'})!=='granted')throw messageError('folder.permissionRequired');const status=await this.status();if(status.state!=='ready')throw status.error;return status;}
 async remember(binding,state){
  const entries=await this.metadata(binding,state);
  // A browser cache failure does not undo a verified disk write.
  try{const current=await this.binding();if(current?.token===binding.token)await this.preferences.set({...binding,name:state.index.name,entries,savedAt:new Date().toISOString()});}catch{}
  return entries;
 }
 async save(meta,bytes,{update=false,expectedLocal=null,isActive=async()=>true}={}){
  const {binding,index,revision}=await this.connected(),store=this.store(binding.handle);
  return store.lock(index.libraryId,async()=>{
   const state=await this.load(binding.handle,binding.libraryId);if(state.revision!==revision)throw messageError('folder.indexChanged');const old=state.index.entries.find(e=>e.resourceId===meta.resourceId);
   if(expectedLocal&&(!old||old.versionId!==expectedLocal.versionId||old.sha256!==expectedLocal.hash||meta.versionId<=old.versionId)||old&&old.versionId!==meta.versionId&&(!update||!expectedLocal&&meta.versionId!==old.versionId+1))throw messageError('folder.versionConflict',meta.name);
   if(!await isActive())throw messageError('folder.canceled');const result=await this.writeRecord(store,state.index,meta,bytes);if(!await isActive())throw messageError('folder.canceled');const final=result.reused?state:await this.commit(store,state,state.index),entries=await this.remember(binding,final);return entries.find(e=>e.resourceId===meta.resourceId);
  });
 }
 async saveBatch(records,{expectedEntries,isActive=()=>true}={}){
  if(!Array.isArray(records)||records.length>1000||!Array.isArray(expectedEntries)||new Set(records.map(r=>r.entry.resourceId)).size!==records.length||records.reduce((sum,r)=>sum+r.bytes.length,0)>64*1024*1024)throw messageError('folder.invalidBatch');
  const {binding,index}=await this.connected(),store=this.store(binding.handle);
  return store.lock(index.libraryId,async()=>{
   const state=await this.load(binding.handle,binding.libraryId),actual=state.index.entries;
   if(actual.length!==expectedEntries.length||actual.some(e=>!expectedEntries.some(old=>old.resourceId===e.resourceId&&old.versionId===e.versionId&&old.hash===e.sha256)))throw messageError('folder.indexChanged');
   if(records.some(({entry})=>actual.some(e=>e.resourceId===entry.resourceId)))throw messageError('folder.invalidBatch');
   for(const {entry,bytes}of records){if(!isActive())throw messageError('folder.canceled');await this.writeRecord(store,state.index,entry,bytes);}
   if(!isActive())throw messageError('folder.canceled');const final=await this.commit(store,state,state.index),entries=await this.remember(binding,final);return records.map(r=>entries.find(e=>e.resourceId===r.entry.resourceId));
  });
 }
 cleanupPlan(binding,state,files){
  for(const file of files){safeLibraryPath(file.path);if(file.path==='index.json')throw messageError('folder.cannotRemoveIndex');}
  const plan={id:crypto.randomUUID(),token:binding.token,libraryId:binding.libraryId,name:state.index.name,folderName:binding.folderName,revision:state.revision,files,bytes:files.reduce((sum,file)=>sum+file.bytes,0)};
  this.cleanupPlans.set(plan.id,structuredClone(plan));if(this.cleanupPlans.size>16)this.cleanupPlans.delete(this.cleanupPlans.keys().next().value);return structuredClone(plan);
 }
 releaseCleanup(id){this.cleanupPlans.delete(id);}
 async checkCleanup(binding,plan){
  if((await this.binding())?.token!==plan.token||binding.token!==plan.token||binding.libraryId!==plan.libraryId)throw messageError('folder.destinationChanged');
  const state=await this.load(binding.handle,binding.libraryId);if(state.revision!==plan.revision)throw messageError('folder.cleanupChanged');
  const used=referencedLibraryFiles(state.index);if(plan.files.some(file=>used.has(file.path.toLowerCase())))throw messageError('folder.cleanupChanged');return state;
 }
 async scanUnused({signal,onProgress}={}){
  return withLibraryTarget(async()=>{
   const {binding,index}=await this.connected(),store=this.store(binding.handle);
   return store.lock(index.libraryId,async()=>{
    const state=await this.load(binding.handle,binding.libraryId),used=referencedLibraryFiles(state.index),paths=(await store.listFiles({signal})).filter(path=>managedLibraryFile(path)&&!used.has(path.toLowerCase()));
    const files=await inspectLibraryFiles(store,paths,{signal,onProgress});if((await this.load(binding.handle,binding.libraryId)).revision!==state.revision)throw messageError('folder.cleanupChanged');
    return this.cleanupPlan(binding,state,files);
   });
  });
 }
 async deletePlannedFiles(binding,store,plan,{signal,onProgress=()=>{}}={}){
  let state=await this.checkCleanup(binding,plan);const present=new Map();
  // Validate the entire preview before deleting its first file.
  for(const file of plan.files){if(signal?.aborted)throw messageError('folder.cleanupCanceled');const bytes=await store.read(file.path);if(bytes!==null&&(bytes.length!==file.bytes||await bytesHash(bytes)!==file.hash))throw messageError('folder.cleanupChanged');present.set(file.path,bytes!==null);}
  const deleted=[],failed=[];let bytes=0;
  for(const file of plan.files){
   try{
    if(signal?.aborted)throw messageError('folder.cleanupCanceled');state=await this.checkCleanup(binding,plan);
    const actual=await store.read(file.path);if(actual!==null&&(actual.length!==file.bytes||await bytesHash(actual)!==file.hash))throw messageError('folder.cleanupChanged');
    const removed=await store.removeFile(file.path);deleted.push(file.path);if(removed&&present.get(file.path))bytes+=file.bytes;
   }catch(cause){const error=cause.messageKey?cause:messageError('folder.fileDeleteFailed',file.path,cause.message??String(cause));failed.push({path:file.path,...serializeMessageError(error)});}
   onProgress({done:deleted.length+failed.length,total:plan.files.length,name:file.path});
  }
  this.releaseCleanup(plan.id);const remaining=plan.files.filter(file=>failed.some(item=>item.path===file.path));
  return {complete:!failed.length,deleted,bytes,failed,plan:remaining.length?this.cleanupPlan(binding,state,remaining):null};
 }
 async cleanFiles(id,options={}){
  return withLibraryTarget(async()=>{
   const plan=this.cleanupPlans.get(id);if(!plan)throw messageError('folder.cleanupChanged');const {binding,index}=await this.connected(),store=this.store(binding.handle);
   return store.lock(index.libraryId,()=>this.deletePlannedFiles(binding,store,plan,options));
  });
 }
 async remove(id,{expectedLocal=null,expectedLibraryId}={}){
  const {binding,index}=await this.connected(),store=this.store(binding.handle);
  if(expectedLibraryId&&binding.libraryId!==expectedLibraryId)throw messageError('folder.destinationChanged');
  return store.lock(index.libraryId,async()=>{
   const state=await this.load(binding.handle,binding.libraryId),old=state.index.entries.find(e=>e.resourceId===id);if(!old)return {removed:false,complete:true,deleted:[],bytes:0,failed:[],plan:null};
   if(expectedLocal&&(old.versionId!==expectedLocal.versionId||old.sha256!==expectedLocal.hash))throw messageError('folder.indexChanged');
   const next={...state.index,entries:state.index.entries.filter(e=>e.resourceId!==id)},used=referencedLibraryFiles(next),owned=(await store.listFiles()).filter(path=>managedLibraryFile(path)?.resourceId===id.toLowerCase());
   const files=await inspectLibraryFiles(store,[...new Set([old.file,...(old.thumbnail&&!old.thumbnail.startsWith('data:')?[old.thumbnail]:[]),...owned])].filter(path=>path!=='index.json'&&!used.has(path.toLowerCase())));
   // Publish the removal first, so file errors cannot leave active broken entries.
   if(old.remoteOrigin)await this.invalidateRemote({sourceId:old.remoteOrigin.sourceId,resourceId:id});
   const final=await this.commit(store,state,next);await this.remember(binding,final);const plan=this.cleanupPlan(binding,final,files);let result;
   try{result=await this.deletePlannedFiles(binding,store,plan);}catch(error){result={complete:false,deleted:[],bytes:0,failed:files.map(file=>({path:file.path,...serializeMessageError(error)})),plan};}
   libraryChanged();return {removed:true,...result};
  });
 }
}
export const folderLibrary=new FolderLibrary();
