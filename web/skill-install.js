import {INSTALL_MANIFEST,skillDirectoryParts,validateSkillFiles,installFilePath} from './agent-install-paths.js';
const utf8=new TextEncoder(),hashBytes=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
export const skillHash=text=>hashBytes(utf8.encode(text));
const missing=error=>error?.name==='NotFoundError';
export async function nestedDirectory(root,parts,create=false){let dir=root;for(const part of parts)dir=await dir.getDirectoryHandle(part,{create});return dir;}
export async function readInstallBytes(root,path){try{const parts=path.split('/'),dir=await nestedDirectory(root,parts.slice(0,-1)),file=await dir.getFileHandle(parts.at(-1));return new Uint8Array(await(await file.getFile()).arrayBuffer());}catch(error){if(missing(error))return null;throw error;}}
export async function readInstallText(root,path){const bytes=await readInstallBytes(root,path);return bytes===null?null:new TextDecoder().decode(bytes);}
async function write(root,path,text){const parts=path.split('/'),dir=await nestedDirectory(root,parts.slice(0,-1),true),file=await dir.getFileHandle(parts.at(-1),{create:true}),stream=await file.createWritable();try{await stream.write(text);await stream.close();}catch(error){try{await stream.abort();}catch{}throw error;}}
async function remove(root,path){const parts=path.split('/'),dir=await nestedDirectory(root,parts.slice(0,-1));await dir.removeEntry(parts.at(-1));}
export async function installRoot(handle,agent,scope,{create=false}={}){return nestedDirectory(handle,skillDirectoryParts(agent,scope,handle.name),create);}
export async function inspectSkill(root,{folder,files}){
 const names=validateSkillFiles(folder,files),hash=await skillHash(JSON.stringify(Object.fromEntries(names.sort().map(n=>[n,files[n]]))));
 let dir;try{dir=await root.getDirectoryHandle(folder);}catch(error){if(missing(error))return {state:'missing',hash};throw error;}
 const text=await readInstallText(dir,INSTALL_MANIFEST);let manifest;try{manifest=JSON.parse(text);}catch{}
 if(manifest?.schema!=='momo.skill-install/v1'||manifest.folder!==folder||!manifest.hashes||typeof manifest.hashes!=='object'||!Object.hasOwn(manifest.hashes,'SKILL.md'))return {state:'unmanaged',hash};
 for(const [name,digest]of Object.entries(manifest.hashes)){try{installFilePath(name);const actual=await readInstallBytes(dir,name);if(actual===null||await hashBytes(actual)!==digest)return {state:'modified',hash};}catch{return {state:'modified',hash};}}
 return {state:manifest.hash===hash?'current':'update',hash,installedAt:manifest.installedAt};
}
export async function installSkill(root,{folder,files},{agent='agents'}={}){
 const names=validateSkillFiles(folder,files),status=await inspectSkill(root,{folder,files});
 if(status.state==='current')return {...status,folder,changed:0};
 const dir=await root.getDirectoryHandle(folder,{create:true}),previous=new Map(),written=[],backup='.momo-backups/'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID();
 // Read and back up all replaced files before changing any of them. Unknown files,
 // node_modules and local notes are preserved. Backups never contain SKILL.md names.
 const same=(bytes,text)=>{if(bytes===null||typeof text!=='string')return false;const expected=utf8.encode(text);return bytes.length===expected.length&&bytes.every((v,i)=>v===expected[i]);};
 for(const name of [...names,INSTALL_MANIFEST])previous.set(name,await readInstallBytes(dir,name));
 for(const [name,bytes]of previous)if(bytes!==null&&!same(bytes,files[name]))await write(dir,backup+'/'+name+'.bak',bytes);
 try{
  for(const name of names)if(!same(previous.get(name),files[name])){written.push(name);await write(dir,name,files[name]);}
  const hashes=Object.fromEntries(await Promise.all(names.map(async name=>[name,await skillHash(files[name])]))),manifest={schema:'momo.skill-install/v1',folder,agent,hash:status.hash,hashes,installedAt:new Date().toISOString()};
  written.push(INSTALL_MANIFEST);await write(dir,INSTALL_MANIFEST,JSON.stringify(manifest,null,2)+'\n');
  return {state:'current',folder,hash:status.hash,changed:written.length-1,backup:status.state==='missing'?null:folder+'/'+backup};
 }catch(error){
  const failures=[];for(const name of written.reverse())try{const old=previous.get(name);if(old===null)await remove(dir,name);else await write(dir,name,old);}catch{failures.push(name);}
  if(failures.length)throw Error(error.message+'; rollback incomplete: '+failures.join(', '));throw error;
 }
}
