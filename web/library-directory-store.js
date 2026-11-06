import {bytesHash} from './graphics-library.js';
import {messageError} from './message-catalog.js';

export function safeLibraryPath(path){
 if(typeof path!=='string'||path.length>240||!path||!/^[a-zA-Z0-9_./-]+$/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..')||!(path==='index.json'||/^(resources\/.*\.zip|thumbnails\/.*\.(png|webp))$/.test(path)))throw messageError('folder.invalidPath');
 return path;
}
// Shared with the standalone library manager. Both writers use the same lock.
export class BrowserDirectoryStore {
 constructor(handle){if(handle?.kind!=='directory')throw messageError('folder.chooseDirectory');this.handle=handle;this.name=handle.name;}
 async file(path,create=false){const parts=safeLibraryPath(path).split('/');let dir=this.handle;for(const name of parts.slice(0,-1))dir=await dir.getDirectoryHandle(name,{create});return dir.getFileHandle(parts.at(-1),{create});}
 async read(path){try{const file=await(await this.file(path)).getFile(),limit=path==='index.json'?8*1024*1024:path.startsWith('thumbnails/')?2*1024*1024:64*1024*1024;if(file.size>limit)throw messageError('folder.fileTooLarge',path);return new Uint8Array(await file.arrayBuffer());}catch(e){if(e.name==='NotFoundError')return null;throw e;}}
 async permission(){if(this.handle.queryPermission&&await this.handle.queryPermission({mode:'readwrite'})!=='granted')throw messageError('folder.permissionRequired');}
 async lock(id,fn){await this.permission();if(!globalThis.navigator?.locks)throw messageError('folder.locksUnavailable');return navigator.locks.request('momo-library-manager-files',fn);}
 async immutable(path,bytes){const old=await this.read(path);if(old!==null){if(await bytesHash(old)!==await bytesHash(bytes))throw messageError('folder.fileConflict',path);return false;}let writable;try{const file=await this.file(path,true),existing=await file.getFile();if(existing.size)throw messageError('folder.fileChanged');writable=await file.createWritable({mode:'exclusive'});await writable.write(bytes);await writable.close();return true;}catch(e){await writable?.abort().catch(()=>{});if(writable&&(await this.read(path))?.length===0)await this.rollback(path).catch(()=>{});throw e;}}
 async commitIndex(bytes,check){const old=await this.read('index.json');await check(old);let writable,created=false;try{const file=await this.file('index.json',true);created=old===null;writable=await file.createWritable({mode:'exclusive'});await writable.write(bytes);const current=await this.read('index.json');await check(created&&current?.length===0?null:current);await writable.close();}catch(e){await writable?.abort().catch(()=>{});if(created&&(await this.read('index.json'))?.length===0)await this.handle.removeEntry('index.json').catch(()=>{});throw e;}}
 async rollback(path){if(path==='index.json')throw messageError('folder.cannotRemoveIndex');const parts=safeLibraryPath(path).split('/');let dir=this.handle;for(const name of parts.slice(0,-1))dir=await dir.getDirectoryHandle(name);await dir.removeEntry(parts.at(-1));}
 async removeFile(path){safeLibraryPath(path);if(path==='index.json')throw messageError('folder.cannotRemoveIndex');try{await this.rollback(path);return true;}catch(e){if(e.name==='NotFoundError')return false;throw e;}}
 async listFiles({signal}={}){
  const files=[];
  const visit=async(directory,prefix)=>{for await(const [name,handle]of directory.entries()){
   if(signal?.aborted)throw messageError('folder.cleanupCanceled');
   const path=prefix+'/'+name;if(!/^[a-zA-Z0-9_./-]+$/.test(path)||path.length>240||name==='.'||name==='..')continue;
   if(handle.kind==='directory')await visit(handle,path);
   else{try{safeLibraryPath(path);}catch{continue;}files.push(path);}
  }};
  for(const name of ['resources','thumbnails']){let directory;try{directory=await this.handle.getDirectoryHandle(name);}catch(error){if(error.name==='NotFoundError')continue;throw error;}await visit(directory,name);}
  return files.sort();
 }
}
