import {graphicAliasesField} from './graphic-name.js';
import {node,PRESET_SCHEMA} from './tree-model.js';
import {encodeResourcePack,finalizeResourcePack} from './resource-pack.js';
import {encodeZIP} from './encoders.js';
import {PACK_LIMIT} from './resource-zip.js';
export async function exportGraphicsLibrary(records,readBundle,onProgress=()=>{}){
 if(!records.length)throw Error('没有可导出的资源，请先选择资源');
 const known=new Map();for(const item of records){const key=item.resourceId+'@'+item.versionId,hash=item.sha256??item.hash;if(hash&&known.has(key)&&known.get(key)!==hash)throw Error('相同资源ID和版本存在不同内容，无法合并导出');if(hash)known.set(key,hash);}
 const unique=[...new Map(records.map(r=>[r.resourceId+'@'+r.versionId,r])).values()],files=[];let bytes=0;
 for(const [i,item] of unique.entries()){
  let data;
  if(item.builtin){const root=node('shape',item.builtin);root.id=item.resourceId;const graphicResource={resourceId:item.resourceId,versionId:item.versionId,personalRevision:0,name:item.name,...graphicAliasesField(item.aliases),category:item.category,description:item.description??'',kind:item.kind,thumbnail:item.thumbnail??'',source:null};data=await encodeResourcePack({schema:PRESET_SCHEMA,name:item.name,root,graphicResource});}
  else {data=await readBundle(item);if(data instanceof Uint8Array)data=await finalizeResourcePack(data);}
  if(!(data instanceof Uint8Array))throw Error('资源数据缺失：'+item.name);
  files.push({name:'resources/'+item.resourceId+'-v'+item.versionId+'.zip',data});bytes+=data.length;
  if(bytes>PACK_LIMIT)throw Error('导出资源超过64MB，请减少选择后分批导出');
  onProgress(i+1,unique.length);await new Promise(resolve=>setTimeout(resolve,0));
 }
 files.push({name:'library.json',data:new TextEncoder().encode(JSON.stringify({schema:'momo.graphics-library/v1',entries:files.map(f=>({file:f.name}))}))});
 const zip=encodeZIP(files);if(zip.length>PACK_LIMIT)throw Error('导出资源超过64MB，请分批导出');return zip;
}
