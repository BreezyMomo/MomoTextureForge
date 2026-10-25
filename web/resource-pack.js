import {normalizeGraphicAliases} from './graphic-name.js';
import {parseSVG} from './svg-resource.js';
import {finalizeImageAsset,needsImageBake} from './image-bake.js';
import {writeResources} from './resource-storage.js';
import {encodeZIP} from './encoders.js';
import {decodeZIP,safePath,PACK_LIMIT} from './resource-zip.js';
import {assetFor,builtinAsset,contentHash,prepareAsset,registerAsset,unregisterAsset,resources,ASSET_KEY,validateAsset,ensureAssetImages} from './resource-assets.js';
import {CATALOG,BY_ID} from './catalog.js';
import engineShaders from './engine-shader-runtime.js';
import handdrawnSources from './handdrawn-runtime.js';
import {effectPresent,POST_EFFECTS} from './post-effect-specs.js';
import {validateEngineShader} from './engine-shader-contract.js';
export const PACK_SCHEMA='momo.texture-pack/v1';
export const ENGINE_ABI='momo-pattern/16-v1';
export const GENERATOR_PACK_ABI='momo-pattern/16-v1+generator-v1';
export async function finalizeResourcePack(bytes){
 const files=await decodeZIP(bytes),manifest=JSON.parse(new TextDecoder().decode(files.get('manifest.json')));
 if(!manifest.assets?.some(record=>needsImageBake(JSON.parse(new TextDecoder().decode(files.get(record.file))))))return bytes;
 const pack=await readResourcePack(bytes);
 try{pack.register();return await encodeResourcePack(pack.payload,pack.payload.schema==='momo.texture-assets/v1'?{assets:[...pack.mapping.values()].map(id=>[id,assetFor(id)])}:{});}finally{pack.rollback();}
}
const utf8=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const bytes64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
function nodes(payload,visit){const roots=payload.schema==='momo.texture-library/v1'?payload.presets?.map(p=>p.root):[payload.root,...(payload.projectResources??[]).map(p=>p.root)];if(!Array.isArray(roots))throw Error('组件入口无效');let count=0;function walk(n){if(!n||++count>10240)throw Error('节点内容无效或过多');visit(n);if(n.children)for(const child of n.children)walk(child);if(n.mask)walk(n.mask);}for(const root of roots)walk(root);}
export async function encodeResourcePack(payload,{assets:provided=null,includeResources=false}={}){
 normalizeGraphicAliases(payload.graphicResource?.aliases);
 const document=structuredClone(payload),assets=new Map(provided??(includeResources?[...resources.keys()].map(id=>[id,assetFor(id)]):[]));
 if(!provided)nodes(document,n=>{if(n.kind==='shape')assets.set(n.type,assetFor(n.type));if(n.arrange?.length>39){const ids=[n.arrange[39],...(n.tracks?.['arrange.39']?.keys??[]).map(k=>k[1])];for(const i of ids){const p=CATALOG[i];if(!p)throw Error('密度图资源不存在');assets.set(p.id,assetFor(p.id));}n.packDensity={base:CATALOG[n.arrange[39]].id,keys:ids.slice(1).map(i=>CATALOG[i].id)};}});
 const entries=new Map(),records=[];const add=(path,data)=>entries.set(path,data),json=(path,value)=>add(path,utf8.encode(JSON.stringify(value,null,2)));
 const effects=new Set();if(document.schema!=='momo.texture-assets/v1')nodes(document,n=>{for(const effect of POST_EFFECTS)if(effectPresent(n,effect.id))effects.add(effect.id);});
 const modules={};for(const id of effects){const module=payload.engineShaderModules?.[id]??engineShaders.effects[id];if(!module)continue;validateEngineShader(module);const descriptor=structuredClone(module);descriptor.files={};for(const [name,text]of Object.entries(module.files)){const path='engine-shaders/effects/'+id+'/'+name;add(path,utf8.encode(text));descriptor.files[name]={file:path};}modules[id]=descriptor;}
 if(effects.has('sketch'))for(const [name,text]of Object.entries(handdrawnSources))add('engine-shaders/effects/sketch/Unity/'+name,utf8.encode(text));
 if(Object.keys(modules).length)document.engineShaderModules=modules;else delete document.engineShaderModules;
 for(const [id,source] of assets){validateAsset(source);const asset=await finalizeImageAsset(source);validateAsset(asset);const hash=await contentHash(asset),descriptor=structuredClone(asset);descriptor.libraries={};
  if(asset.engineShaders?.unity){descriptor.engineShaders.unity.files={};for(const [name,text]of Object.entries(asset.engineShaders.unity.files)){const path=`shaders/${hash}/${name}`;add(path,utf8.encode(text));descriptor.engineShaders.unity.files[name]={file:path};}}
  for(const [name,text] of Object.entries(asset.libraries)){const path=`formulas/${await contentHash(text)}.glsl`;add(path,utf8.encode(text));descriptor.libraries[name]={file:path};}
  for(const spec of [descriptor.definition.outputs.scalar,descriptor.definition.seamless.source].filter(Boolean)){const path=`formulas/${await contentHash(spec.inline)}.glsl`;add(path,utf8.encode(spec.inline));delete spec.inline;spec.file=path;}
  if(asset.kind==='image'){const path=`images/${hash}.${(asset.mime==='image/svg+xml'?'svg':asset.mime.split('/')[1])}`;add(path,Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)));delete descriptor.data;descriptor.file=path;}
  const path=`shapes/${hash}.json`;json(path,descriptor);records.push({id,hash,file:path});
 }
 const hasGenerator=[...assets.values()].some(asset=>!!asset.definition.generator);
 json('content.json',document);json('manifest.json',{schema:PACK_SCHEMA,abi:hasGenerator?GENERATOR_PACK_ABI:ENGINE_ABI,content:'content.json',assets:records});
 if([...entries.values()].reduce((n,b)=>n+b.length,0)>PACK_LIMIT)throw Error('资源包超过64MB');
 return encodeZIP([...entries].map(([name,data])=>({name,data})));
}
export async function readResourcePack(buffer){
 const files=await decodeZIP(buffer),read=path=>{safePath(path);const data=files.get(path);if(!data)throw Error('缺少资源文件：'+path);return data;},json=path=>JSON.parse(decoder.decode(read(path)));
 const manifest=json('manifest.json');if(manifest.schema!==PACK_SCHEMA||![ENGINE_ABI,GENERATOR_PACK_ABI].includes(manifest.abi))throw Error('资源包格式或公式接口版本不兼容');
 if(!Array.isArray(manifest.assets))throw Error('资源包图形列表格式无效');
 const payload=json(manifest.content);normalizeGraphicAliases(payload.graphicResource?.aliases);const prepared=[],mapping=new Map();
 if(payload.engineShaderModules)for(const module of Object.values(payload.engineShaderModules)){for(const [name,spec]of Object.entries(module.files??{}))module.files[name]=decoder.decode(read(spec.file));validateEngineShader(module);}
 try{for(const record of manifest.assets){if(typeof record.id!=='string'||mapping.has(record.id))throw Error('图形资源ID重复或无效');const asset=json(record.file);
   for(const [name,spec]of Object.entries(asset.libraries??{}))asset.libraries[name]=decoder.decode(read(spec.file));
   for(const spec of [asset.definition?.outputs?.scalar,asset.definition?.seamless?.source].filter(Boolean)){spec.inline=decoder.decode(read(spec.file));delete spec.file;}
   if(asset.kind==='image'){asset.data=bytes64(read(asset.file));delete asset.file;}
   if(asset.engineShaders?.unity)for(const [name,spec]of Object.entries(asset.engineShaders.unity.files??{}))asset.engineShaders.unity.files[name]=decoder.decode(read(spec.file));
   if(asset.definition?.generator&&manifest.abi!==GENERATOR_PACK_ABI)throw Error('生成器资源包缺少接口能力声明');
   validateAsset(asset);if(await contentHash(asset)!==record.hash)throw Error('图形资源内容校验失败：'+record.id);
   let id='asset_'+record.hash;try{if(await contentHash(builtinAsset(asset.definition.id))===record.hash)id=asset.definition.id;}catch{}
   mapping.set(record.id,id);if(!BY_ID.has(id)&&!prepared.some(p=>p[0]===id))prepared.push([id,asset,await prepareAsset(asset)]);
  }
  if(payload.schema!=='momo.texture-assets/v1')nodes(payload,n=>{if(n.kind==='shape'){if(!mapping.has(n.type))throw Error('缺少图形依赖：'+n.type);n.type=mapping.get(n.type);}if(n.arrange?.[0]===12&&!n.packDensity)throw Error('缺少密度图依赖');if(n.packDensity){for(const id of [n.packDensity.base,...n.packDensity.keys])if(!mapping.has(id))throw Error('缺少密度图：'+id);}});
 }catch(e){for(const [,,b]of prepared)b?.close();throw e;}
 await ensureAssetImages(mapping.values());
 let registered=false,committed=false;
 return {payload,prepared,mapping,register(){if(registered)return;for(const args of prepared)registerAsset(...args);registered=true;if(payload.schema!=='momo.texture-assets/v1')nodes(payload,n=>{if(n.packDensity){n.arrange[39]=BY_ID.get(mapping.get(n.packDensity.base)).index;const keys=n.tracks?.['arrange.39']?.keys??[];if(keys.length!==n.packDensity.keys.length)throw Error('密度图轨道无效');keys.forEach((k,i)=>k[1]=BY_ID.get(mapping.get(n.packDensity.keys[i])).index);delete n.packDensity;}});},async persist(){await writeResources([...resources]);committed=true;},rollback(){if(committed)return;if(registered)for(const [id]of [...prepared].reverse())unregisterAsset(id);else for(const [,,b]of prepared)b?.close();}};
}
export async function imageAsset(file){
 if(file.size>16*1024*1024)throw Error('图片超过16MB');
 const asset=builtinAsset('Circle');delete asset.engineShaders;asset.kind='image';asset.mime=/\.svg$/i.test(file.name)?'image/svg+xml':file.type;if(asset.mime==='image/svg+xml')parseSVG(await file.text());asset.data=bytes64(new Uint8Array(await file.arrayBuffer()));const d=asset.definition;d.id='Image';delete d.aliases;d.name=file.name.replace(/\.[^.]+$/,'').slice(0,80)||'图片';d.parameters=[{slot:0,key:'R',variable:'imageMode',role:'image-mode',aliases:{'zh-CN':'图片显示',en:'Image mode'},label:'图片显示',min:0,max:2,step:1,default:0}];d.defaults=Array(16).fill(0);d.editor={kind:'parameters'};d.seamless={kind:'blend'};d.outputs={scalar:{kind:'body',inline:'vec2 size=vec2(textureSize(assetImage,0));float ratio=size.x/size.y;u=(u-.5)*vec2(max(1.,1./ratio),max(1.,ratio))+.5;if(any(lessThan(u,vec2(0)))||any(greaterThan(u,vec2(1))))return 0.;vec4 pixel=texture(assetImage,u);return a.x>.5&&a.x<1.5?dot(pixel.rgb,vec3(.2126,.7152,.0722))*pixel.a:pixel.a;',libraries:['math-v1']}};return asset;
}
