import {exportGraphicsLibrary} from './graphics-export.js';
import {libraryAuthoring} from './library-authoring-export.js';
import {CATALOG} from './catalog.js';
import {libraryVisible} from './library-policy.js';
import {libraryEntries,libraryBundle,bundleKey,builtinIdentity,bytesHash,deleteLibraryEntry} from './graphics-library.js';
import {remoteSources,remoteCatalogs,remoteDownloads,remoteBundle} from './remote-library-storage.js';
import {latestRemoteDownloads} from './remote-library-model.js';
import {graphicVariantKey,groupGraphics} from './graphics-identity.js';
import {createLibraryAIContext} from './ai-context.js';
import {encodeResourcePack,readResourcePack} from './resource-pack.js';
import {assetFor} from './resource-assets.js';
import {node,PRESET_SCHEMA} from './tree-model.js';

const sourceOf=item=>item.builtin?'builtin':item.remote?'remote':'local';
const summary=item=>({key:graphicVariantKey(item),source:sourceOf(item),resourceId:item.resourceId,versionId:item.versionId,
 name:item.name,aliases:item.aliases??{},category:item.category??'',description:item.description??'',kind:item.generator?'generator':item.kind,
 builtin:item.builtin??null,sourceId:item.sourceId??null,sourceName:item.sourceName??null,hash:item.sha256??item.hash??null,
 cached:!!item.cached,thumbnailAvailable:!!item.thumbnail,tags:item.tags??[]});
export function createLiveLibrary({readLocal=libraryEntries,readSources=remoteSources,readCatalogs=remoteCatalogs,readDownloads=remoteDownloads,
 readLocalBundle=libraryBundle,readRemoteBundle=remoteBundle,removeLocal=deleteLibraryEntry,getBuiltins=()=>CATALOG.filter(p=>!p.id.startsWith('asset_')&&libraryVisible(p.id)),context=createLibraryAIContext}={}){
 async function entries(){
  const [local,sources,catalogs,downloads]=await Promise.all([readLocal(),readSources(),readCatalogs(),readDownloads()]);
  const builtin=await Promise.all(getBuiltins().map(async p=>({name:p.definition.name,aliases:p.definition.aliases,category:p.definition.category,kind:'formula',generator:!!p.definition.generator,builtin:p.id,resourceId:await builtinIdentity(p.id),versionId:p.definition.revision,personalRevision:0,cached:true})));
  const cached=latestRemoteDownloads(downloads).map(item=>({...item,remote:true,cached:true})),remote=[...cached];
  for(const catalog of catalogs){const source=sources.find(s=>s.id===catalog.sourceId&&s.enabled);if(!source)continue;
   for(const item of catalog.entries)if(!cached.some(c=>c.sourceId===source.id&&c.resourceId===item.resourceId&&c.versionId===item.versionId))remote.push({...item,remote:true,cached:false,sourceId:source.id,sourceName:source.name});
  }
  const items=[...new Map([...builtin,...local.map(item=>({...item,cached:true})),...remote].map(item=>[graphicVariantKey(item),item])).values()];
  items.sort((a,b)=>graphicVariantKey(a).localeCompare(graphicVariantKey(b)));
  return {items,sources};
 }
 const bundle=item=>item.remote?readRemoteBundle(item):readLocalBundle(bundleKey(item));
 return async(operation,args={},isActive=()=>true)=>{
  const {items,sources}=await entries();if(!isActive())throw Error('Library request expired');
  const all=items.map(summary),revision=await bytesHash(new TextEncoder().encode(JSON.stringify(all)));
  if(operation==='library-list'){
   const {query='',source='all',sourceId,kind='all',offset=0,limit=30}=args;
   if(typeof query!=='string'||query.length>256||!['all','builtin','local','remote','downloaded'].includes(source)||!['all','formula','generator','image','composition'].includes(kind)||!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid library query');
   const q=query.trim().toLowerCase(),filtered=all.filter(item=>(source==='all'||source==='downloaded'&&item.source==='remote'&&item.cached||source===item.source)&&(!sourceId||sourceId===item.sourceId)&&(kind==='all'||kind===item.kind)&&(!q||JSON.stringify([item.name,item.aliases,item.category,item.tags,item.builtin,item.resourceId]).toLowerCase().includes(q)));
   const conflicts=new Set(groupGraphics(items).filter(g=>g.conflict).map(g=>g.resourceId));
   return {revision,total:filtered.length,offset,items:filtered.slice(offset,offset+limit).map(item=>({...item,conflict:conflicts.has(item.resourceId.toLowerCase())})),sources:sources.map(({id,name,url,enabled,lastChecked,error})=>({id,name,url,enabled,lastChecked,error})),scope:'Native builtin and local library plus cached remote catalogs/downloads; no network refresh or download.'};
  }
  if(operation==='library-catalog-export'){
   if(!Array.isArray(args.keys)||!args.keys.length||args.keys.length>1000||new Set(args.keys).size!==args.keys.length)throw Error('Choose 1 to 1000 unique library keys');
   const selected=args.keys.map(key=>{const item=items.find(e=>graphicVariantKey(e)===key);if(!item)throw Error('Unknown library key');return item;});
   const catalog=await context(selected,item=>item.remote?null:bundle(item),{scope:'selected',onProgress:()=>{if(!isActive())throw Error('Catalog export expired');}});if(!isActive())throw Error('Catalog export expired');
   return {items:selected.map(summary),json:catalog};
  }
  if(operation==='library-export-batch'){
   if(!Array.isArray(args.keys)||!args.keys.length||args.keys.length>1000||new Set(args.keys).size!==args.keys.length)throw Error('Choose 1 to 1000 unique resource keys');
   const selected=args.keys.map(key=>{const item=items.find(e=>graphicVariantKey(e)===key);if(!item)throw Error('Unknown library key');return item;});
   const bytes=await exportGraphicsLibrary(selected,bundle,()=>{if(!isActive())throw Error('Export expired');});if(!isActive())throw Error('Export expired');
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {items:selected.map(summary),zip:btoa(binary),sha256:await bytesHash(bytes)};
  }
  const item=items.find(item=>graphicVariantKey(item)===args.key);if(!item)throw Error('Unknown library key; query forge_library again');
  if(operation==='library-delete'){
   if(item.builtin||item.remote)throw Error('Only local library originals can be deleted by this operation');
   if(args.expectedLibraryRevision!==revision)throw Error('Library changed; query forge_library again');
   if(!isActive())throw Error('Library request expired');
   await removeLocal(item.resourceId,{expectedLocal:{versionId:item.versionId,hash:item.hash}});
   return {applied:true,item:summary(item),scope:'Local library original deleted; existing canvas instances and personal graphics-list entries are unchanged.'};
  }
  if(operation==='library-authoring-export'){
   let asset,pack;try{
    if(item.builtin)asset=assetFor(item.builtin);
    else{const bytes=await bundle(item);if(!bytes)throw Error('Resource must be cached before authoring export');pack=await readResourcePack(bytes);const root=pack.payload.root;if(root?.kind!=='shape')throw Error('Composition authoring exports as native ZIP');asset=new Map(pack.prepared).get(root.type)??assetFor(root.type);}
    if(!isActive())throw Error('Authoring export expired');return {item:summary(item),json:libraryAuthoring(asset,item)};
   }finally{pack?.rollback();}
  }
  if(operation==='library-detail'){
   const details=await context([item],bundle,{scope:'selected'});if(!isActive())throw Error('Library request expired');
   let source;
   if(args.includeSource){
    if(item.builtin)source={root:node('shape',item.builtin),assets:[{id:item.builtin,asset:structuredClone(assetFor(item.builtin))}]};
    else{const bytes=await bundle(item);if(bytes){const pack=await readResourcePack(bytes);try{const prepared=new Map(pack.prepared.map(([id,asset])=>[id,asset]));source={payload:pack.payload,assets:[...new Set(pack.mapping.values())].map(id=>({id,asset:structuredClone(prepared.get(id)??assetFor(id))}))};}finally{pack.rollback();}}}
   }
   if(!isActive())throw Error('Library request expired');
   return {revision,item:summary(item),details:details.entries[0],...(source?{source}:{})};
  }
  if(operation==='library-export'){
   const bytes=item.builtin?await encodeResourcePack({schema:PRESET_SCHEMA,name:item.name,root:node('shape',item.builtin),graphicResource:{resourceId:item.resourceId,versionId:item.versionId,personalRevision:0,name:item.name,aliases:item.aliases??{},category:item.category,kind:'formula',...(item.generator?{generator:true}:{})}}):await bundle(item);
   if(!bytes)throw Error('Resource is not downloaded; explicitly download it before export');
   if(!isActive())throw Error('Library request expired');
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {item:summary(item),zip:btoa(binary),sha256:await bytesHash(bytes)};
  }
  throw Error('Unsupported library operation');
 };
}
