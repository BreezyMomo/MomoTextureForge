import {graphicAliasesField} from './web/graphic-name.js';
import {decodeZIP} from './web/resource-zip.js';
import {bytesHash,validateEntry} from './web/graphics-library.js';
import {REMOTE_SCHEMA,REMOTE_LIMITS,validateRemoteIndex} from './web/remote-library-model.js';
import {PACK_SCHEMA,ENGINE_ABI} from './web/resource-pack.js';
const decoder=new TextDecoder('utf-8',{fatal:true}),encoder=new TextEncoder();
const json=(files,path)=>{if(!files.has(path))throw Error('缺少资源文件：'+path);return JSON.parse(decoder.decode(files.get(path)));};
export async function buildRemoteLibrary(inputs,{name='远程图形库',previous=null}={}){
 if(previous)validateRemoteIndex(previous,'https://library.invalid/index.json');
 const files=new Map(),entries=new Map((previous?.entries??[]).map(e=>[e.resourceId,e]));
 const packages=[];
 for(const bytes of inputs){if(bytes.length>REMOTE_LIMITS.bundle)throw Error('输入资源超过64MB');const zip=await decodeZIP(bytes);
  if(zip.has('library.json')){const library=json(zip,'library.json');if(library.schema!=='momo.graphics-library/v1'||!Array.isArray(library.entries)||library.entries.length>REMOTE_LIMITS.entries)throw Error('图库导出格式无效');for(const entry of library.entries){if(!zip.has(entry.file))throw Error('图库缺少资源包');packages.push(zip.get(entry.file));}}
  else packages.push(bytes);
 }
 for(const bytes of packages){const zip=await decodeZIP(bytes),manifest=json(zip,'manifest.json');if(manifest.schema!==PACK_SCHEMA||manifest.abi!==ENGINE_ABI)throw Error('资源包接口版本不兼容');const payload=json(zip,manifest.content),meta=payload.graphicResource;validateEntry(meta);if(payload.schema!=='momo.texture-subtree/v1'||!payload.root)throw Error('需要从图形库导出的正式单资源ZIP');const sha256=await bytesHash(bytes),old=entries.get(meta.resourceId);if(old?.versionId===meta.versionId&&old.sha256!==sha256)throw Error('相同资源ID和版本的内容不同，请发布新版本');if(old?.versionId>meta.versionId)throw Error('不能用旧版本替换目录中的新版本');
  const file='resources/'+meta.resourceId+'-v'+meta.versionId+'.zip';let thumbnail='';if(meta.thumbnail){const match=/^data:image\/(png|webp);base64,(.+)$/.exec(meta.thumbnail);thumbnail='thumbnails/'+meta.resourceId+'-v'+meta.versionId+'.'+match[1];files.set(thumbnail,Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0)));}files.set(file,bytes);const record=manifest.assets?.find(a=>a.id===payload.root.type),asset=record?json(zip,record.file):null;entries.set(meta.resourceId,{...(asset?.kind==='image'?{imageMime:asset.mime}:{}),resourceId:meta.resourceId,versionId:meta.versionId,name:meta.name,...graphicAliasesField(meta.aliases),kind:meta.kind,category:meta.category??'',description:meta.description??'',thumbnail,file,sha256});
 }
 const index={schema:REMOTE_SCHEMA,libraryId:previous?.libraryId??crypto.randomUUID(),name,entries:[...entries.values()].sort((a,b)=>a.resourceId.localeCompare(b.resourceId))};validateRemoteIndex(index,'https://library.invalid/index.json');files.set('index.json',encoder.encode(JSON.stringify(index,null,2)));return {index,files};
}
