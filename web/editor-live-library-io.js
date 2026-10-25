import {stageResourceFiles} from './resource-import.js';
import {libraryEntries,saveLibraryBatch,libraryIdentity,bytesHash} from './graphics-library.js';
import {createLiveResource,renderPreview} from './editor-live-resource.js';
import {graphicVariantKey} from './graphics-identity.js';

export function createLiveLibraryImport({library,readLocal=libraryEntries,save=saveLibraryBatch,render=renderPreview,stage=stageResourceFiles}={}){
 return async(args,isActive=()=>true)=>{
  const check=async()=>{if(!isActive())throw Error('Import expired');if((await library('library-list',{limit:1},isActive)).revision!==args.expectedLibraryRevision)throw Error('Library changed; query again');};
  await check();
  if(!Array.isArray(args.files)||!args.files.length||args.files.length>100||!['error','copy'].includes(args.conflict??'error'))throw Error('Invalid import request');
  let size=0;const files=args.files.map(file=>{
   if(typeof file.name!=='string'||typeof file.data!=='string'||file.data.length>89478488||!/^[A-Za-z0-9+/]+={0,2}$/.test(file.data))throw Error('Invalid import file');
   const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));if((size+=bytes.length)>64*1024*1024)throw Error('Import exceeds 64 MiB');return new File([bytes],file.name);
  });
  const before=await readLocal(),staged=await stage(files,render),records=[],skipped=[],ids=new Set();
  if(staged.length>1000)throw Error('Import exceeds 1000 resources');
  const create=createLiveResource({library,render,save:async(entry,bytes)=>{records.push({entry,bytes});return entry;}});
  for(const item of staged){
   await check();
   if(item.draft){const bytes=new TextEncoder().encode(JSON.stringify(item.draft));let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));await create({mime:'application/json',data:btoa(binary),expectedLibraryRevision:args.expectedLibraryRevision},isActive);continue;}
   let entry={...libraryIdentity(item.meta),...item.meta,thumbnail:item.thumbnail},bytes=item.originalBytes??item.bytes;
   const old=before.find(e=>e.resourceId===entry.resourceId),hash=await bytesHash(bytes);
   if(old&&old.versionId===entry.versionId&&old.hash===hash){skipped.push({resourceId:old.resourceId,reason:'identical'});continue;}
   if(old||ids.has(entry.resourceId)){
    if(args.conflict!=='copy')throw Error('Resource identity conflict; use conflict: copy to import a separate original');
    entry={...entry,...libraryIdentity()};
   }
   // Re-encode metadata when creating a separate identity; source bytes must
   // describe the same identity as the library index.
   if(entry.resourceId!==item.meta.resourceId||entry.versionId!==item.meta.versionId){
    const {readResourcePack,encodeResourcePack}=await import('./resource-pack.js'),pack=await readResourcePack(bytes);
    try{pack.register();bytes=await encodeResourcePack({...pack.payload,graphicResource:entry});}finally{pack.rollback();}
   }
   ids.add(entry.resourceId);records.push({entry,bytes});
  }
  await check();
  if(!records.length)return {applied:false,entries:[],skipped};
  const entries=await save(records,{expectedEntries:before,isActive});
  return {applied:true,entries:entries.map(entry=>({key:graphicVariantKey(entry),entry})),skipped,scope:'Local library only; canvas and personal list are unchanged.'};
 };
}
