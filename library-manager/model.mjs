import {buildRemoteLibrary} from '../remote-library-publisher.mjs';
import {validateRemoteIndex,REMOTE_SCHEMA} from '../web/remote-library-model.js';
import {validatePortablePack} from './validate-pack.mjs';
import {bytesHash} from '../web/graphics-library.js';
import {safeLibraryPath} from './storage.mjs';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const fail=message=>{throw Error(message);};
function limited(value,max,label,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())fail(label+'无效');return value.trim();}
export class LocalLibrary {
 static async open(store,history){const model=new LocalLibrary(store,history);await model.load();return model;}
 constructor(store,history){this.store=store;this.snapshots=history;this.empty={schema:REMOTE_SCHEMA,libraryId:crypto.randomUUID(),name:'我的图库',entries:[]};this.pending=null;}
 async validate(index){if(encoder.encode(JSON.stringify(index)).length>8*1024*1024)fail('图库目录超过8MB');validateRemoteIndex(index,'https://library.invalid/index.json');for(const e of index.entries){safeLibraryPath(e.file);if(e.thumbnail&&!e.thumbnail.startsWith('data:'))safeLibraryPath(e.thumbnail);}return index;}
 async revision(bytes){return bytes===null?'missing':bytesHash(bytes);}
 async load(){const raw=await this.store.read('index.json');if(raw===null)return {index:structuredClone(this.empty),revision:'missing',root:this.store.name};const revision=await this.revision(raw);if(this.validated?.revision!==revision)this.validated={index:await this.validate(JSON.parse(decoder.decode(raw))),revision};return {...structuredClone(this.validated),root:this.store.name};}
 async current(revision){const state=await this.load();if(state.revision!==revision)fail('目录已被其他窗口或程序修改，请刷新后重试');return state;}
 async history(){return this.snapshots.list((await this.load()).index.libraryId);}
 async save(index,revision,reason,files=new Map(),deletion=null){
  await this.validate(index);
  return this.store.lock(index.libraryId,async()=>{
   const state=await this.current(revision),created=[];
   for(const [file,bytes]of files){if(file==='index.json')continue;const old=await this.store.read(safeLibraryPath(file));if(old!==null&&await bytesHash(old)!==await bytesHash(bytes))fail('已有版本文件内容不同，不能覆盖：'+file);}
   await this.snapshots.add(state.index,reason);
   try{
    for(const [file,bytes]of files){if(file==='index.json')continue;if(await this.store.immutable(safeLibraryPath(file),bytes))created.push(file);}
    await this.current(revision);await this.store.commitIndex(encoder.encode(JSON.stringify(index,null,2)+'\n'),async current=>{if(await this.revision(current)!==revision)fail('目录已被其他窗口或程序修改，请刷新后重试');});
    this.pending=null;
   }catch(e){for(const file of created)await this.store.rollback(file).catch(()=>{});throw e;}
   const cleanup=deletion?{removed:[],missing:[],failed:[],shared:deletion.shared}:null;
   if(deletion)for(const path of deletion.paths)try{(await this.store.removeFile(path)?cleanup.removed:cleanup.missing).push(path);}catch(e){cleanup.failed.push({path,message:e.message});}
   const result=await this.load();return cleanup?{...result,cleanup}:result;
  });
 }
 async preview(inputs,revision){
  const {index}=await this.current(revision);if(!Array.isArray(inputs)||!inputs.length||inputs.length>32||inputs.reduce((n,b)=>n+b.length,0)>64*1024*1024)fail('每次选择1～32个正式资源ZIP，合计不超过64MB');
  const prepared=await buildRemoteLibrary(inputs,{name:index.name,previous:index});for(const [file,bytes]of prepared.files)if(file.endsWith('.zip'))await validatePortablePack(bytes);
  const changes=[];for(const entry of prepared.index.entries){const old=index.entries.find(e=>e.resourceId===entry.resourceId);if(!old)changes.push({name:entry.name,version:entry.versionId,action:'新增'});else if(old.sha256===entry.sha256)Object.assign(entry,old);else changes.push({name:entry.name,version:entry.versionId,action:'更新 v'+old.versionId+' → v'+entry.versionId});}
  for(const [file,bytes]of prepared.files){if(file==='index.json')continue;const old=await this.store.read(safeLibraryPath(file));if(old!==null&&await bytesHash(old)!==await bytesHash(bytes))fail('已有版本文件内容不同，不能覆盖：'+file);}
  const id=crypto.randomUUID();this.pending={id,revision,index:prepared.index,files:prepared.files};return {id,revision,changes,unchanged:prepared.index.entries.length-changes.length,total:prepared.index.entries.length};
 }
 async apply(id,revision){const p=this.pending;if(!p||p.id!==id||p.revision!==revision)fail('导入预览已失效，请重新选择文件');return this.save(p.index,revision,'导入资源',p.files);}
 async edit(id,fields,revision){const {index}=await this.current(revision),entry=index.entries.find(e=>e.resourceId===id);if(!entry)fail('资源已不在目录中');entry.name=limited(fields.name,80,'资源名称',true);entry.category=limited(fields.category,80,'分类');entry.description=limited(fields.description,2000,'说明');if(!Array.isArray(fields.tags)||fields.tags.length>32)fail('标签最多32个');entry.tags=[...new Set(fields.tags.map(t=>limited(t,80,'标签',true)))];return this.save(index,revision,'编辑资源信息');}
 async rename(name,revision){const {index}=await this.current(revision);index.name=limited(name,80,'图库名称',true);return this.save(index,revision,'修改图库名称');}
 async remove(ids,revision){if(!Array.isArray(ids)||!ids.length||ids.length>2000)fail('请选择资源');const {index}=await this.current(revision);if(ids.some(id=>!index.entries.some(e=>e.resourceId===id)))fail('部分资源已不在目录中，请刷新');index.entries=index.entries.filter(e=>!ids.includes(e.resourceId));return this.save(index,revision,'移出目录 '+ids.length+' 项（保留资源文件）');}
 async deletePermanently(ids,revision){
  if(!Array.isArray(ids)||!ids.length||ids.length>2000||ids.some(id=>typeof id!=='string'))fail('请选择资源');
  const {index}=await this.current(revision),chosen=new Set(ids);if([...chosen].some(id=>!index.entries.some(e=>e.resourceId===id)))fail('部分资源已不在目录中，请刷新');
  const paths=e=>[e.file,...(e.thumbnail&&!e.thumbnail.startsWith('data:')?[e.thumbnail]:[])].map(safeLibraryPath),removed=index.entries.filter(e=>chosen.has(e.resourceId));
  index.entries=index.entries.filter(e=>!chosen.has(e.resourceId));const retained=new Set(index.entries.flatMap(paths)),candidates=new Set(removed.flatMap(paths));
  return this.save(index,revision,'彻底删除 '+chosen.size+' 项（文件不可通过目录快照恢复）',new Map(),{paths:[...candidates].filter(p=>!retained.has(p)),shared:[...candidates].filter(p=>retained.has(p))});
 }
 async restoreIndex(index,revision){await this.validate(index);const current=await this.current(revision);if(index.libraryId!==current.index.libraryId)fail('备份不属于当前图库');for(const entry of index.entries){const bytes=await this.store.read(entry.file);if(bytes===null||await bytesHash(bytes)!==entry.sha256)fail('备份引用的资源文件缺失或已改变');}return this.save(index,revision,'恢复目录快照');}
 async restore(id,revision){const snapshot=await this.snapshots.get(id);if(!snapshot)fail('快照已不存在');return this.restoreIndex(snapshot.index,revision);}
 async thumbnail(file){const {index}=await this.load();if(!index.entries.some(e=>e.thumbnail===file)||!/^thumbnails\/.*\.(png|webp)$/.test(file))fail('缩略图不在当前目录中');const bytes=await this.store.read(file);if(!bytes||bytes.length>2*1024*1024)fail('缩略图缺失或超过2MB');return bytes;}
}
