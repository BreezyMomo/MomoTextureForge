import {BY_ID} from './catalog.js';
import {decodeZIP} from './resource-zip.js';
import {formulaUsesTime} from './formula-time.js';

const metadata=(d,time,kind='formula')=>({id:d.id,name:d.name,kind:d.generator?'generator':kind,version:d.revision,description:d.description??'',parameters:structuredClone(d.parameters),defaults:[...d.defaults],supportsTime:time,seamless:d.seamless.kind,...(d.generator?{generator:{schema:d.generator.schema,effect:d.generator.effect},parameterKeyframes:true}:{})});
export async function createLibraryAIContext(items,readBundle,{scope='selected',onProgress=()=>{}}={}){
 if(!items.length)throw Error('没有可导出的图形，请先选择资源或调整筛选条件。');
 const entries=[];
 for(const item of items){
  const entry={resourceId:item.resourceId,version:item.versionId,name:item.name,category:item.category??'',description:item.description??'',tags:item.tags??[],kind:item.kind,source:item.builtin?'builtin':item.remote?'remote':'local',sourceName:item.sourceName??''};
  if(item.builtin){const p=BY_ID.get(item.builtin);if(!p)throw Error('缺少图形：'+item.name);entry.definitions=[metadata(p.definition,!!p.usesTime)];}
  else try{
   const bytes=await readBundle(item);
   if(!bytes)throw Error('未读取资源包，仅提供目录摘要');
   const files=await decodeZIP(bytes),read=path=>{const b=files.get(path);if(!b)throw Error('资源包缺少文件：'+path);return new TextDecoder().decode(b);};
   const manifest=JSON.parse(read('manifest.json'));
   entry.definitions=(manifest.assets??[]).map(record=>{
    const asset=JSON.parse(read(record.file)),d=asset.definition;
    const libraries=Object.fromEntries(Object.entries(asset.libraries??{}).map(([k,v])=>[k,typeof v==='string'?v:read(v.file)]));
    const spec=d.outputs.scalar,sources=spec.file?{[spec.file]:read(spec.file)}:{};
    return {...metadata(d,asset.kind==='image'?false:formulaUsesTime(d,sources,libraries),asset.kind),...(asset.mime?{mime:asset.mime}:{})};
   });
  }catch(error){entry.detailsUnavailable=error.message;}
  entries.push(entry);onProgress(entries.length,items.length);
 }
 return {schema:'momo.ai-library-context/v1',scope,purpose:'供AI了解当前图形库、推荐图形与操作步骤，不是可导入资源包',notes:['只含目录与参数元数据，不含作品节点、图片像素或公式源码。','definitions是资源自身及依赖的图形定义，组合资源可能包含多个定义。','detailsUnavailable表示详细信息未知，不可猜测参数；空间无缝不代表动画首尾衔接。'],entries};
}
