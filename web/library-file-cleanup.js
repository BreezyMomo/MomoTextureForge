import {bytesHash,validateEntry} from './graphics-library.js';
import {decodeZIP} from './resource-zip.js';
import {messageError} from './message-catalog.js';

const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const resource=new RegExp('^resources/(?:[a-z0-9_-]+/)*('+uuid+')-v([1-9][0-9]*)\\.zip$','i');
const thumbnail=new RegExp('^thumbnails/(?:[a-z0-9_-]+/)*('+uuid+')-v([1-9][0-9]*)\\.(png|webp)$','i');
export function managedLibraryFile(path){const match=resource.exec(path)??thumbnail.exec(path);return match&&Number.isSafeInteger(Number(match[2]))?{resourceId:match[1].toLowerCase(),versionId:Number(match[2])}:null;}
// Preserve references with different filename casing on Windows as well.
export function referencedLibraryFiles(index){return new Set(index.entries.flatMap(entry=>[entry.file,...(entry.thumbnail&&!entry.thumbnail.startsWith('data:')?[entry.thumbnail]:[])]).map(path=>path.toLowerCase()));}
export async function inspectLibraryFiles(store,paths,{signal,onProgress=()=>{}}={}){
 const files=[];
 for(const path of [...new Set(paths)].sort()){
  if(signal?.aborted)throw messageError('folder.cleanupCanceled');
  const bytes=await store.read(path);if(bytes===null)continue;
  const identity=managedLibraryFile(path),file={path,bytes:bytes.length,hash:await bytesHash(bytes),...identity};
  if(path.endsWith('.zip'))try{const archive=await decodeZIP(bytes),content=archive.get('content.json'),meta=content&&JSON.parse(new TextDecoder().decode(content)).graphicResource;
   if(meta&&(!identity||meta.resourceId.toLowerCase()===identity.resourceId&&meta.versionId===identity.versionId)){validateEntry(meta);file.name=meta.name;file.aliases=meta.aliases??{};file.versionId=meta.versionId;}
  }catch{/* Incomplete generated files can still be explicitly cleaned. */}
  files.push(file);onProgress({done:files.length,total:paths.length,name:path});
 }
 const names=new Map(files.filter(file=>file.name&&file.resourceId).map(file=>[file.resourceId+'@'+file.versionId,{name:file.name,aliases:file.aliases}]));
 for(const file of files)if(!file.name&&file.resourceId){const label=names.get(file.resourceId+'@'+file.versionId);if(label)Object.assign(file,label);}
 return files;
}
