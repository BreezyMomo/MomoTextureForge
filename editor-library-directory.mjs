import {readFile,writeFile,mkdir,realpath,lstat,unlink,rename,open,readdir,link} from 'node:fs/promises';
import {resolve,join,dirname,relative,isAbsolute} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {LocalLibrary} from './library-manager/model.mjs';
import {safeLibraryPath} from './library-manager/storage.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export class NodeLibraryStore{
 constructor(root){this.root=root;this.name=root;}
 async path(name,create=false){
  if(await realpath(this.root)!==this.root)throw Error('Library directory changed');safeLibraryPath(name);const target=resolve(this.root,name),rel=relative(this.root,target);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Library path escapes directory');
  let current=this.root;
  for(const [i,part]of name.split('/').entries()){
   current=join(current,part);let info;try{info=await lstat(current);}catch(e){if(e.code!=='ENOENT')throw e;if(create&&i<name.split('/').length-1){await mkdir(current,{recursive:false});info=await lstat(current);}else if(!create)break;}
   if(info?.isSymbolicLink())throw Error('Library symlinks/junctions are not supported');
  }
  return target;
 }
 async read(name){const file=await this.path(name);try{const info=await lstat(file),limit=name==='index.json'?8*1024*1024:name.startsWith('thumbnails/')?2*1024*1024:64*1024*1024;if(!info.isFile()||info.size>limit)throw Error('Invalid or oversized library file');return new Uint8Array(await readFile(file));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async lock(id,fn){const file=join(this.root,'.momo-mcp-manager.lock');let lease;try{lease=await open(file,'wx');await lease.writeFile(String(process.pid));}catch(e){if(e.code==='EEXIST')throw Error('Library is locked by another MCP operation; do not edit this directory concurrently in another manager');throw e;}try{return await fn();}finally{await lease.close();await unlink(file);}}
 async immutable(name,bytes){const previous=await this.read(name);if(previous!==null){if(hash(previous)!==hash(bytes))throw Error('Existing version has different bytes');return false;}const file=await this.path(name,true),temp=join(dirname(file),'.momo-'+randomUUID()+'.tmp');try{await writeFile(temp,bytes,{flag:'wx'});await link(temp,file);return true;}finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}}
 async commitIndex(bytes,check){const file=await this.path('index.json',true),temp=join(this.root,'.momo-index-'+randomUUID()+'.tmp');await check(await this.read('index.json'));try{await writeFile(temp,bytes,{flag:'wx'});await check(await this.read('index.json'));await rename(temp,file);}finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}}
 async rollback(name){if(name==='index.json')throw Error('Cannot delete index directly');await unlink(await this.path(name));}
 async removeFile(name){try{await this.rollback(name);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
}
class DirectorySnapshots{
 constructor(root){this.root=root;}
 async add(index,reason){await mkdir(this.root,{recursive:true});const snapshot={id:randomUUID(),createdAt:Date.now(),reason,index:structuredClone(index)};await writeFile(join(this.root,snapshot.id+'.json'),JSON.stringify(snapshot),{flag:'wx'});return snapshot.id;}
 async list(libraryId){let names;try{names=await readdir(this.root);}catch(e){if(e.code==='ENOENT')return [];throw e;}const result=[];for(const name of names){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;const item=await this.get(name.slice(0,-5));if(item.index.libraryId===libraryId)result.push(item);}return result.sort((a,b)=>b.createdAt-a.createdAt);}
 async get(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid history snapshot');try{return JSON.parse(await readFile(join(this.root,id+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
}
export class EditorLibraryDirectories{
 constructor(directory){this.directory=directory;this.handles=new Map();}
 async open(directory){
  if(!isAbsolute(directory))throw Error('Library directory must be an absolute user-selected path');
  const root=await realpath(directory),info=await lstat(root);if(!info.isDirectory())throw Error('Expected a directory');
  for(const [handleId,entry]of this.handles)if(entry.root===root)return {handleId,...await entry.model.load()};
  if(this.handles.size>=16)throw Error('At most 16 open library directories');
  const cache=resolve(await this.directory(),'directory-history',hash(root)),model=await LocalLibrary.open(new NodeLibraryStore(root),new DirectorySnapshots(cache)),handleId=randomUUID();
  this.handles.set(handleId,{root,model,tail:Promise.resolve()});return {handleId,...await model.load()};
 }
 async execute({handleId,action,expectedRevision,...args}){
  const entry=this.handles.get(handleId);if(!entry)throw Error('Unknown library directory handle');
  const work=async()=>{
   const m=entry.model;
   if(action==='read')return {handleId,...await m.load()};
   if(action==='history')return {handleId,snapshots:(await m.history()).map(({index,...s})=>({...s,name:index.name,entries:index.entries.length}))};
   await m.current(expectedRevision);
   let result;
   switch(action){
    case 'preview-import':{
     if(!Array.isArray(args.inputFiles)||!args.inputFiles.length||args.inputFiles.length>32)throw Error('Choose 1..32 resource ZIP files');
     let total=0;const inputs=[];for(const file of args.inputFiles){if(!isAbsolute(file))throw Error('Input files must be absolute');const info=await lstat(file);total+=info.size;if(!info.isFile()||total>64*1024*1024)throw Error('Resource input exceeds 64 MiB');inputs.push(new Uint8Array(await readFile(file)));}result=await m.preview(inputs,expectedRevision);break;
    }
    case 'apply-import':result=await m.apply(args.previewId,expectedRevision);break;
    case 'rename':result=await m.rename(args.name,expectedRevision);break;
    case 'edit-metadata':result=await m.edit(args.resourceId,args.fields,expectedRevision);break;
    case 'withdraw':result=await m.remove(args.resourceIds,expectedRevision);break;
    case 'delete-files':if(args.confirmDeleteFiles!==true)throw Error('Deleting resource files requires explicit confirmDeleteFiles:true');result=await m.deletePermanently(args.resourceIds,expectedRevision);break;
    case 'restore-index':{if(!isAbsolute(args.inputFile??''))throw Error('Index input must be absolute');const info=await lstat(args.inputFile);if(!info.isFile()||info.size>8*1024*1024)throw Error('Index input exceeds 8 MiB');result=await m.restoreIndex(JSON.parse(await readFile(args.inputFile,'utf8')),expectedRevision);break;}
    case 'restore':result=await m.restore(args.historyId,expectedRevision);break;
    case 'export-index':{const {index}=await m.load(),file=resolve(await this.directory(),'library-index-'+randomUUID()+'.json');const bytes=Buffer.from(JSON.stringify(index,null,2));await writeFile(file,bytes,{flag:'wx'});result={file,bytes:bytes.length,sha256:hash(bytes)};break;}
    default:throw Error('Unknown library directory action');
   }
   return {handleId,...result,...(action==='preview-import'?{previewId:result.id}:{})};
  };
  const pending=entry.tail.then(work);entry.tail=pending.catch(()=>{});return pending;
 }
}
