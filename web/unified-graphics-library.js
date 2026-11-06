import {CATALOG,BY_ID} from './catalog.js';
import {libraryVisible} from './library-policy.js';
import {graphicAliasesField} from './graphic-name.js';
import {graphicLabel,categoryLabel} from './graphic-label.js';
import {graphicIsAnimated} from './graphic-list-filters.js';
import {graphicVariantKey,groupGraphics,preferredGraphic} from './graphics-identity.js';
import {libraryEntries,libraryBundle,bundleKey,builtinIdentity,bytesHash,libraryIdentity,saveLibraryEntry,deleteLibraryEntry} from './graphics-library.js';
import {remoteSources,remoteCatalogs,remoteDownloads,readRemoteResource} from './remote-library.js';
import {localLibraryVariants,mergeRemoteResources} from './remote-resource-store.js';
import {readResourcePack,encodeResourcePack} from './resource-pack.js';
import {contentHash,ensureAssetImages,resources} from './resource-assets.js';
import {projectDependencyIds} from './project-dependencies.js';
import {node,project,sanitizeTree,cloneNode,PRESET_SCHEMA} from './tree-model.js';
import {onLibraryChange} from './library-events.js';
import {messageError} from './message-catalog.js';
import builtinThumbnails from './builtin-thumbnails.js';

const canonical=value=>JSON.stringify(value,(key,item)=>['id','resourceRef'].includes(key)?undefined:item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const uuidFromHash=h=>h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);
export class UnifiedGraphicsLibrary {
 constructor({readLocal=libraryEntries,readBundle=libraryBundle,readSources=remoteSources,readCatalogs=remoteCatalogs,readDownloads=remoteDownloads,download=readRemoteResource,save=saveLibraryEntry,remove=deleteLibraryEntry,builtins=()=>CATALOG.filter(p=>!p.id.startsWith('asset_')&&libraryVisible(p.id)),storage=globalThis.localStorage}={}){
  Object.assign(this,{readLocal,readBundle,readSources,readCatalogs,readDownloads,download,save,remove,builtins,storage});this.items=[];this.sources=[];this.loaded=new Map();this.listeners=new Set();this.selected=new Map();this.aliases=new Map();this.revision=0;
  try{this.selected=new Map(JSON.parse(storage?.getItem('momo-unified-library:sources:v1')??'[]'));}catch{}
 }
 subscribe(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 notify(){for(const listener of this.listeners)listener();}
 select(resourceId,key){this.selected.set(resourceId,key);try{this.storage?.setItem('momo-unified-library:sources:v1',JSON.stringify([...this.selected]));}catch{}this.notify();}
 async refresh(){
  const revision=++this.revision,[local,sources,catalogs,downloads]=await Promise.all([this.readLocal(),this.readSources(),this.readCatalogs(),this.readDownloads()]);
  this.builtinItems??=Promise.all(this.builtins().map(async p=>{const resourceId=await builtinIdentity(p.id),root=node('shape',p.id);root.resourceRef=resourceId;return {id:resourceId,resourceId,builtin:p.id,versionId:p.definition.revision,personalRevision:0,name:p.definition.name,...graphicAliasesField(p.definition.aliases),category:categoryLabel(p.category),kind:'formula',generator:!!p.definition.generator,thumbnail:builtinThumbnails[p.id],root,animated:graphicIsAnimated({root})};}));
  const remote=mergeRemoteResources(local,sources,catalogs,downloads);
  const items=[...new Map([...await this.builtinItems,...localLibraryVariants(local),...remote].map(item=>[graphicVariantKey(item),{...item,id:item.resourceId,personalRevision:0}])).values()];
  if(revision!==this.revision)return this.items;this.items=items;this.sources=sources;this.notify();return items;
 }
 entries(){return groupGraphics(this.items).map(group=>this.describe(preferredGraphic(group.variants,this.selected.get(group.resourceId))));}
 describe(item){const cached=this.loaded.get(graphicVariantKey(item));return {...item,id:item.resourceId,root:cached&&cached.signature===this.signature(item)?cached.entry.root:item.root??null,source:item.source??null};}
 signature(item){return [item.versionId,item.hash??item.sha256??'',item.sourceId??'',item.libraryId??''].join(':');}
 find(id){const resolved=this.aliases.get(id)??id;return this.entries().find(entry=>entry.id===resolved);}
 async materialize(input){
  const item=typeof input==='string'?this.find(input):input;if(!item)throw messageError('unified.resourceMissing');
  if(item.root){await ensureAssetImages(projectDependencyIds({root:item.root}));return item;}
  const signature=this.signature(item),key=graphicVariantKey(item),cached=this.loaded.get(key);if(cached?.signature===signature){await ensureAssetImages(projectDependencyIds({root:cached.entry.root}));return cached.entry;}
  const bytes=item.remote&&!item.folderVariant?await this.download(item):await this.readBundle(bundleKey(item));if(!bytes)throw messageError('unified.resourceMissing');const pack=await readResourcePack(bytes);
  try{pack.register();const root=sanitizeTree({...project(),root:pack.payload.root,projectResources:[]},{component:true}).root;root.resourceRef=item.resourceId;const entry={...item,id:item.resourceId,root,name:item.name,source:item.source??pack.payload.graphicResource?.source??null};this.loaded.set(key,{signature,entry});this.notify();return entry;}catch(error){pack.rollback();throw error;}
 }
 materialized(){return this.entries().filter(entry=>entry.root);}
 async saveRoot(root,{existing=null,name=root.name,aliases,category=existing?.category,description=existing?.description,thumbnail='',expectedDestination}={}){
  const own=existing&&!existing.builtin&&!existing.remote&&!existing.legacy;
  const kind=root.kind==='shape'?(existing?.kind??(resources.get(root.type)?.kind==='image'?'image':'formula')):'composition',generator=root.kind==='shape'&&!!BY_ID.get(root.type)?.definition.generator;
  const meta={...libraryIdentity(own?{resourceId:existing.resourceId,versionId:existing.versionId+1}:{}),name,aliases:aliases??(own?existing.aliases??{}:{}),category:category??'我的图形',description:description??'',kind,...(generator?{generator:true}:{}),thumbnail,animated:graphicIsAnimated({root}),source:existing?(own?existing.source??{resourceId:existing.resourceId,versionId:existing.versionId}:{resourceId:existing.resourceId,versionId:existing.versionId}):null};
  // Native packs preserve all instance parameters, effects, child nodes and keys.
  const savedRoot=structuredClone(root);delete savedRoot.resourceRef;const bytes=await encodeResourcePack({schema:PRESET_SCHEMA,name,root:savedRoot,graphicResource:meta});
  const options=own?{update:true,expectedLocal:{versionId:existing.versionId,hash:existing.hash}}:{};if(expectedDestination!==undefined)options.expectedDestination=expectedDestination;
  const entry=await this.save(meta,bytes,options);await this.refresh();return this.materialize(entry);
 }
 async rename(input,metadata){const existing=await this.materialize(input);return this.saveRoot(existing.root,{existing,...metadata,thumbnail:existing.thumbnail});}
 async delete(input,{expectedDestination}={}){const item=typeof input==='string'?this.find(input):input;if(!item||item.builtin||item.remote&&!item.folder)throw messageError('unified.readOnlyResource');const options={expectedLocal:{versionId:item.versionId,hash:item.hash}};if(item.libraryId)options.expectedLibraryId=item.libraryId;if(expectedDestination!==undefined)options.expectedDestination=expectedDestination;const result=await this.remove(item.resourceId,options);await this.refresh();return result;}
 async migrateLegacy(entries,{thumbnail=()=>'',onProgress=()=>{},expectedDestination}={}){
  const mappings=[],pending=[];let copied=0;await this.refresh();
  for(const entry of entries){
   onProgress(entry);const current=this.find(entry.resourceId),root=entry.root;
   let same=false;
   if(current&&entry.personalRevision===0&&entry.name===current.name&&canonical(entry.aliases??{})===canonical(current.aliases??{})){
    try{const original=await this.materialize(current);same=canonical({...root,name:undefined})===canonical({...original.root,name:undefined});}catch{}
   }
   if(same){this.aliases.set(entry.id,current.id);mappings.push([entry.id,current.id]);continue;}
   try{
    const fingerprint=await contentHash({legacyId:entry.id,resourceId:entry.resourceId,versionId:entry.versionId,name:entry.name,aliases:entry.aliases??{},root:JSON.parse(canonical(root))}),resourceId=uuidFromHash(fingerprint),old=(await this.readLocal()).find(e=>e.resourceId===resourceId);
    const meta={...libraryIdentity({resourceId}),name:entry.name,aliases:entry.aliases??{},category:entry.category??'我的图形',description:entry.description??'',kind:entry.kind??'composition',thumbnail:old?.thumbnail??await thumbnail(root),animated:graphicIsAnimated(entry),source:{resourceId:entry.resourceId,versionId:entry.versionId},legacyFingerprint:fingerprint};
    const bytes=old?await this.readBundle(bundleKey(old)):await encodeResourcePack({schema:PRESET_SCHEMA,name:entry.name,root:structuredClone(root),graphicResource:meta});
    const saved=old??await this.save(meta,bytes,expectedDestination===undefined?{}:{expectedDestination});const written=await this.readBundle(bundleKey(saved));if(!written||await bytesHash(written)!==saved.hash)throw messageError('unified.migrationVerification');
    this.aliases.set(entry.id,resourceId);mappings.push([entry.id,resourceId]);copied++;
   }catch(error){pending.push({entry,error});}
  }
  await this.refresh();return {copied,mappings,pending};
 }
}
export const unifiedGraphicsLibrary=new UnifiedGraphicsLibrary();
let timer;onLibraryChange(()=>{clearTimeout(timer);timer=setTimeout(()=>unifiedGraphicsLibrary.refresh().catch(()=>{}),0);});
