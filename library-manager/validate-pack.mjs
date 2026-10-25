import {decodeZIP,safePath} from '../web/resource-zip.js';
import {contentHash,validateAsset} from '../web/resource-assets.js';
// Validate portable content without creating image bitmaps or executing formulas.
export async function validatePortablePack(bytes){
 const files=await decodeZIP(bytes),decoder=new TextDecoder('utf-8',{fatal:true}),read=path=>{safePath(path);if(!files.has(path))throw Error('缺少资源文件：'+path);return files.get(path);},json=path=>JSON.parse(decoder.decode(read(path))),manifest=json('manifest.json');
 if(!Array.isArray(manifest.assets)||manifest.assets.length>256)throw Error('资源依赖列表无效');const ids=new Set(),assets=new Map();
 for(const record of manifest.assets){if(typeof record.id!=='string'||ids.has(record.id))throw Error('资源依赖ID无效或重复');ids.add(record.id);const asset=json(record.file);
  for(const [name,spec]of Object.entries(asset.libraries??{}))asset.libraries[name]=decoder.decode(read(spec.file));
  for(const spec of [asset.definition?.outputs?.scalar,asset.definition?.seamless?.source].filter(Boolean)){spec.inline=decoder.decode(read(spec.file));delete spec.file;}
  if(asset.kind==='image'){const bytes=read(asset.file);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));asset.data=btoa(binary);delete asset.file;}
  if(asset.engineShaders?.unity)for(const [name,spec]of Object.entries(asset.engineShaders.unity.files??{}))asset.engineShaders.unity.files[name]=decoder.decode(read(spec.file));
  validateAsset(asset);if(await contentHash(asset)!==record.hash)throw Error('资源依赖内容校验失败：'+record.id);assets.set(record.id,asset);
 }
 let count=0;const visit=(n,depth=0)=>{if(!n||typeof n!=='object'||++count>256||depth>12||!['shape','group'].includes(n.kind))throw Error('资源节点结构无效或超过上限');if(n.kind==='shape'&&!ids.has(n.type))throw Error('缺少图形依赖：'+n.type);if(n.arrange?.[0]===12&&!n.packDensity)throw Error('缺少密度图依赖');if(n.packDensity){if(!Array.isArray(n.packDensity.keys)||[n.packDensity.base,...n.packDensity.keys].some(id=>!ids.has(id)))throw Error('缺少密度图依赖');}if(n.children){if(!Array.isArray(n.children))throw Error('子节点无效');for(const child of n.children)visit(child,depth+1);}if(n.mask)visit(n.mask,depth+1);};const payload=json(manifest.content);visit(payload.root);if(payload.graphicResource.kind!=='composition'&&(payload.root.kind!=='shape'||assets.get(payload.root.type)?.kind!==payload.graphicResource.kind))throw Error('资源类型与入口图形不一致');
}
