import {validateEntry} from './graphics-library.js';
import {decodeZIP,safePath} from './resource-zip.js';
import {readResourcePack,encodeResourcePack} from './resource-pack.js';
import {AUTHORING_LIMIT} from './ai-authoring.js';
import {parseCreationAuthoring} from './creation-authoring.js';
import {assetFor} from './resource-assets.js';
import {node,PRESET_SCHEMA,cloneNode} from './tree-model.js';
export async function stageResourceFiles(files,thumbnail){
 let total=0;const pending=[],staged=[];
 for(const file of files){total+=file.size;if(total>64*1024*1024)throw Error('所选文件合计超过64MB');
  if(/\.json$/i.test(file.name)){if(file.size>AUTHORING_LIMIT)throw Error('JSON超过2MB');staged.push({draft:parseCreationAuthoring(await file.text())});continue;}
  if(!/\.zip$/i.test(file.name))throw Error('导入文件页签只接受JSON或ZIP');
  const bytes=new Uint8Array(await file.arrayBuffer()),entries=await decodeZIP(bytes);
  if(entries.has('library.json')){const index=JSON.parse(new TextDecoder().decode(entries.get('library.json')));if(index.schema!=='momo.graphics-library/v1'||!Array.isArray(index.entries))throw Error('图形库清单无效');let expanded=0;for(const entry of index.entries){safePath(entry.file);const data=entries.get(entry.file);if(!data)throw Error('资源包缺少 '+entry.file);expanded+=data.length;if(expanded>64*1024*1024)throw Error('图形库解包超过64MB');pending.push(data);}}
  else pending.push(bytes);
 }
 for(const bytes of pending){let pack;try{pack=await readResourcePack(bytes);pack.register();const p=pack.payload;if(p.graphicResource)validateEntry(p.graphicResource);const roots=p.schema==='momo.texture-library/v1'?p.presets.map(x=>x.root):p.root?[p.root]:[...pack.mapping.values()].map(id=>node('shape',id));
  for(const root of roots){const asset=root.kind==='shape'?structuredClone(assetFor(root.type)):null,meta={...p.graphicResource,name:p.graphicResource?.name??root.name,category:p.graphicResource?.category??'我的图形',description:p.graphicResource?.description??'',kind:p.graphicResource?.kind??(asset?.kind??'composition')};const pic=thumbnail(root);const normalized=await encodeResourcePack({schema:PRESET_SCHEMA,name:meta.name,root:cloneNode(root),graphicResource:meta});staged.push({meta,asset,bytes:normalized,originalBytes:p.graphicResource&&roots.length===1?bytes:null,thumbnail:pic});}
 }finally{pack?.rollback();}}
 return staged;
}
