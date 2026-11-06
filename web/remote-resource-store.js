import {bytesHash,bundleKey} from './graphics-library.js';
import {assertRemoteIdentity,assertRemoteConflict,latestRemoteDownloads} from './remote-library-model.js';
import {readResourcePack} from './resource-pack.js';
import {project,sanitizeTree,PRESET_SCHEMA} from './tree-model.js';
import {assetFor} from './resource-assets.js';
import {messageError} from './message-catalog.js';
import {libraryChanged} from './library-events.js';

export const savedRemoteEntry=entry=>({...entry,remote:true,cached:entry.available!==false,sourceId:entry.remoteOrigin.sourceId,sourceName:entry.remoteOrigin.name,originURL:entry.remoteOrigin.url,file:entry.remoteOrigin.file??'',sha256:entry.hash??entry.sha256});
// A storage choice for the same immutable package, retaining its remote origin
// and edit-as-new behavior. No second package or library record is created.
export const localLibraryVariants=entries=>entries.map(entry=>entry.remoteOrigin?{...savedRemoteEntry(entry),file:entry.file,folderVariant:true}:entry);
// Several subscriptions may advertise the same immutable package. They share
// the one physical resource saved in the current library folder.
export function mergeRemoteResources(local,sources,catalogs,downloads){
 const items=latestRemoteDownloads(downloads).map(entry=>({...entry,remote:true,cached:entry.cached!==false}));
 for(const catalog of catalogs){const source=sources.find(s=>s.id===catalog.sourceId&&s.enabled);if(!source)continue;for(const entry of catalog.entries){
  if(items.some(e=>e.sourceId===source.id&&e.resourceId===entry.resourceId&&e.versionId===entry.versionId&&e.sha256===entry.sha256))continue;
  const saved=local.find(e=>e.resourceId===entry.resourceId&&e.versionId===entry.versionId&&e.hash===entry.sha256);
  items.push({...saved,...entry,remote:true,cached:!!saved&&saved.available!==false,sourceId:source.id,sourceName:source.name});
 }}return items;
}
const same=(a,b)=>a?.versionId===b?.versionId&&(a?.hash??a?.sha256)===(b?.hash??b?.sha256);
export class RemoteResourceStore {
 constructor({folder,target,sources,catalogs,epoch,fetchBundle,thumbnail=async()=>''}){Object.assign(this,{folder,target,sources,catalogs,epoch,fetchBundle,thumbnail});this.memory=new Map();this.reading=new Map();this.saving=new Map();}
 async downloads(){return (await this.folder.entries()).filter(entry=>entry.remoteOrigin).map(savedRemoteEntry);}
 async bundle(item){const entry=(await this.folder.entries()).find(entry=>entry.resourceId===item.resourceId&&entry.versionId===item.versionId&&(entry.hash??entry.sha256)===item.sha256);return entry?this.folder.bundle(bundleKey(entry)):null;}
 async currentSource(item){const source=(await this.sources()).find(s=>s.id===item.sourceId);if(!source?.enabled)throw messageError('remote.sourceUnavailable');const catalog=(await this.catalogs()).find(c=>c.sourceId===source.id);if(!catalog?.entries.some(e=>e.resourceId===item.resourceId&&e.versionId===item.versionId&&e.sha256===item.sha256&&e.file===item.file))throw messageError('remote.catalogChanged');return {...source};}
 async checkBytes(item,bytes){
  if(await bytesHash(bytes)!==item.sha256)throw messageError('remote.hashMismatch');const pack=await readResourcePack(bytes);
  try{if(pack.payload.schema!==PRESET_SCHEMA||!pack.payload.root)throw messageError('remote.invalidPack');assertRemoteIdentity(item,pack.payload.graphicResource);pack.register();sanitizeTree({...project(),root:pack.payload.root},{component:true});let imageMime;
   if(item.kind!=='composition'){if(pack.payload.root.kind!=='shape')throw messageError('remote.invalidPack');const asset=assetFor(pack.payload.root.type);if((asset.kind==='image'?'image':'formula')!==item.kind)throw messageError('remote.invalidPack');if(asset.kind==='image'){imageMime=asset.mime;if(item.imageMime&&item.imageMime!==imageMime)throw messageError('remote.invalidPack');}}
   return {...pack.payload.graphicResource,...(imageMime?{imageMime}:{})};
  }finally{pack.rollback();}
 }
 async read(item,options={}){
  if(options.signal?.aborted)throw messageError('library.actionCanceled');const saved=await this.bundle(item);if(saved)return saved;await this.currentSource(item);
  const key=[item.sourceId,item.resourceId,item.versionId,item.sha256,item.file].join(':');if(this.memory.has(key))return this.memory.get(key).slice();
  // Requests with cancellation signals are independent: closing one preview must
  // not cancel another caller's save.
  if(!options.signal&&this.reading.has(key))return (await this.reading.get(key)).slice();
  const operation=(async()=>{const bytes=await this.fetchBundle(item,options);await this.checkBytes(item,bytes);if(options.signal?.aborted)throw messageError('library.actionCanceled');this.memory.set(key,bytes.slice());let size=[...this.memory.values()].reduce((sum,b)=>sum+b.length,0);while(this.memory.size>16||size>64*1024*1024){const oldest=this.memory.keys().next().value;size-=this.memory.get(oldest).length;this.memory.delete(oldest);}return bytes;})();
  if(!options.signal)this.reading.set(key,operation);try{return (await operation).slice();}finally{if(!options.signal)this.reading.delete(key);}
 }
 async save(item,options={}){
  // Preflight before any network request, and pin the exact destination.
  const {binding}=await this.folder.connected();if(Object.hasOwn(options,'expectedDestination')&&binding.token!==options.expectedDestination)throw messageError('folder.destinationChanged');
  const old=(await this.folder.entries()).find(e=>e.resourceId===item.resourceId),downloadEpoch=options.cacheEpoch??await this.epoch(item),key=[binding.token,item.sourceId,item.resourceId,item.versionId,item.sha256,downloadEpoch].join(':');
  if(this.saving.has(key))return this.saving.get(key);
  const operation=(async()=>{
   assertRemoteConflict(item,old?[old]:[]);if(old?.versionId===item.versionId)return this.target(async()=>{if(options.signal?.aborted)throw messageError('library.actionCanceled');if((await this.folder.binding())?.token!==binding.token)throw messageError('folder.destinationChanged');return this.bundle(item).then(bytes=>{if(!bytes)throw messageError('folder.indexChanged');return bytes;});});
   if(old&&(!old.remoteOrigin||old.versionId>item.versionId))throw messageError('folder.versionConflict',item.name);
   const source=await this.currentSource(item),bytes=await this.read(item,options),meta=await this.checkBytes(item,bytes),thumbnail=await this.thumbnail(item,options)||meta.thumbnail||'';
   const active=async()=>{if(options.signal?.aborted)throw messageError('library.actionCanceled');if((await this.folder.binding())?.token!==binding.token)throw messageError('folder.destinationChanged');if(await this.epoch(item)!==downloadEpoch)throw messageError('remote.saveCanceled');const current=await this.currentSource(item);if(current.url!==source.url)throw messageError('remote.sourceUnavailable');return true;};
   return this.target(async()=>{await active();const current=(await this.folder.entries()).find(e=>e.resourceId===item.resourceId);if(old?!same(old,current):!!current)throw messageError('folder.indexChanged');
    await this.folder.save({...meta,...item,thumbnail,...(meta.generator?{generator:true}:{}),...(meta.imageMime?{imageMime:meta.imageMime}:{}),remoteOrigin:{sourceId:source.id,name:source.name,url:source.url,file:item.file}},bytes,{update:!!old,expectedLocal:old?{versionId:old.versionId,hash:old.hash}:null,isActive:active});
    const written=await this.folder.bundle(bundleKey(item));if(await bytesHash(written)!==item.sha256)throw messageError('remote.hashMismatch');libraryChanged();return written;
   });
  })();this.saving.set(key,operation);try{return await operation;}finally{this.saving.delete(key);}
 }
 async remove(item,{expectedDownloads,expectedDestination}={}){
  return this.target(async()=>{const binding=await this.folder.binding();if(expectedDestination!==undefined&&binding?.token!==expectedDestination)throw messageError('folder.destinationChanged');const downloads=await this.downloads();if(expectedDownloads&&JSON.stringify(downloads)!==JSON.stringify(expectedDownloads))throw messageError('folder.indexChanged');const entry=downloads.find(e=>e.sourceId===item.sourceId&&e.resourceId===item.resourceId);if(!entry)throw messageError('folder.resourceMissing');if(!same(entry,item))throw messageError('folder.indexChanged');return this.folder.remove(entry.resourceId,{expectedLocal:{versionId:entry.versionId,hash:entry.hash},expectedLibraryId:entry.libraryId});});
 }
}
