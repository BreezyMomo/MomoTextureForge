// Real filesystem adapter for testing the browser-compatible Skill writer.
import {mkdir,lstat,readFile,writeFile,rename,unlink,open} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
const absent=error=>error.code==='ENOENT';
const missing=()=>Object.assign(Error('File not found'),{name:'NotFoundError'});
function childPath(root,name){if(typeof name!=='string'||!name||name==='.'||name==='..'||/[\\/:\x00-\x1f]/.test(name))throw Error('Invalid directory entry');return join(root,name);}
export class NativeDirectory{
 constructor(path){this.path=resolve(path);this.name=basename(this.path);}
 async getDirectoryHandle(name,{create=false}={}){const path=childPath(this.path,name);try{const info=await lstat(path);if(info.isSymbolicLink()||!info.isDirectory())throw Error('Directory is a link or has the wrong type: '+path);}catch(error){if(!absent(error))throw error;if(!create)throw missing();await mkdir(path);}return new NativeDirectory(path);}
 async getFileHandle(name,{create=false}={}){
  const path=childPath(this.path,name);try{const info=await lstat(path);if(info.isSymbolicLink()||!info.isFile())throw Error('File is a link or has the wrong type: '+path);}catch(error){if(!absent(error))throw error;if(!create)throw missing();const file=await open(path,'wx');await file.close();}
  return {getFile:async()=>({arrayBuffer:async()=>{const bytes=await readFile(path);return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}}),createWritable:async()=>{
   const temporary=join(dirname(path),'.momo-write-'+randomUUID());return {write:data=>writeFile(temporary,data,{flag:'wx'}),close:()=>rename(temporary,path),abort:async()=>{try{await unlink(temporary);}catch(error){if(!absent(error))throw error;}}};
  }};
 }
 async removeEntry(name){await unlink(childPath(this.path,name));}
}
