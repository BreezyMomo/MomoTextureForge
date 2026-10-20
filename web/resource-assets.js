import {prepareSVG,svgText,validateSvgText} from './svg-resource.js';
import {validateImageProcessing,validateImageTransform,validateImageColor,prepareImageBitmap} from './image-processing.js';
import {formulaUsesTime} from './formula-time.js';
import {readResources} from './resource-storage.js';
import {GRAPHIC_LIST_KEY} from './persistent-graphic-list.js';
import {BUILTIN} from './definition-runtime.js';
import {CATALOG,BY_ID,CATEGORIES} from './catalog.js';
import {validateLibrary,validateFormula,LIBRARY_SCHEMA,PATTERN_ABI} from './definition-schema.js';
export const ASSET_KEY='momo-texture-resources:v1';
export const resources=new Map();
export const bitmaps=new Map();
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export async function contentHash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function builtinAsset(id){
 const p=BUILTIN.catalog.find(p=>p.id===id);if(!p)throw Error('缺少基础图形：'+id);
 const definition=structuredClone(p.definition),names=new Set(['math-v1']);
 for(const name of definition.generator?.libraries??[])names.add(name);
 for(const spec of [definition.outputs.scalar,definition.seamless.source].filter(Boolean)){for(const n of spec.libraries)names.add(n);spec.inline=spec.inline??BUILTIN.sources[spec.file];delete spec.file;}
 if(definition.seamless.kind==='periodic')names.add('periodic-v1');if(p.vector)names.add('vector-v1');
 const libraries=Object.fromEntries([...names].map(n=>[n,BUILTIN.libraries[n]]));
 return {kind:'formula',definition,libraries,vectorIds:p.vector?BUILTIN.catalog.map(p=>p.id):[]};
}
export function assetFor(id){const asset=resources.get(id)??builtinAsset(id);return asset;}
export function validateAsset(asset){
 if(!asset||!['formula','image'].includes(asset.kind))throw Error('图形资源类型不支持');
 const d=structuredClone(asset.definition);d.order=0;d.variant=0;d.category='imported';
 const libs=asset.libraries;if(!libs||Object.keys(libs).length>32)throw Error('公式函数库无效');
 const library={schema:LIBRARY_SCHEMA,abi:PATTERN_ABI,revision:1,categories:[{id:'imported',name:'导入图形'}],patterns:[d],libraries:Object.fromEntries(Object.keys(libs).map((n,i)=>[n,{abi:PATTERN_ABI,file:`lib${i}.glsl`}]))};
 validateLibrary(library);
 for(const spec of [d.outputs.scalar,d.seamless.source].filter(Boolean)){if(spec.file)throw Error('图形公式未解析');validateFormula(spec.inline,spec.kind,d.id);}
 for(const text of Object.values(libs))if(typeof text!=='string'||text.length>1048576||/^\s*#\s*(?:extension|include|version)/m.test(text))throw Error('公式函数库无效或超过大小限制');
 if(d.generator?.effect==='pipeline')for(const pass of d.generator.passes){
  const source=[...(d.generator.helpers??[]),pass.program].map(id=>libs[id]).join('\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,' ');
  for(const match of source.matchAll(/\binput([012])\b/g))if(Number(match[1])>=pass.inputs.length)throw Error('生成器步骤 '+pass.id+' 使用了未连接的 input'+match[1]);
 }
 if(asset.kind==='image'&&(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(asset.mime)||typeof asset.data!=='string'||asset.data.length>22000000))throw Error('图片资源无效');
 if(asset.kind==='image'){validateImageColor(asset.imageColor);validateImageTransform(asset.imageTransform);validateImageProcessing(asset.imageProcessing);if(asset.mime==='image/svg+xml'){validateSvgText(svgText(asset));if(asset.imageProcessing)throw Error('SVG不支持位图处理设置');}}
 return asset;
}
export async function prepareAsset(asset){validateAsset(asset);return asset.kind==='image'?(asset.mime==='image/svg+xml'?prepareSVG(asset):prepareImageBitmap(asset)):null;}
export function registerAsset(id,asset,bitmap=null){
 if(BY_ID.has(id))return;const d=asset.definition;let category=CATEGORIES.findIndex(c=>c.resourceCategory);if(category<0){category=CATEGORIES.length;CATEGORIES.push({name:'导入图形',category,count:0,resourceCategory:true});}
 const item={usesTime:formulaUsesTime(d,asset.sources??{},asset.libraries??{}),id,zh:d.name,category,categoryName:'导入图形',variant:CATEGORIES[category].count++,vector:!!d.outputs.vector,parameters:d.parameters,defaults:d.defaults,definition:d,index:CATALOG.length};
 CATALOG.push(item);BY_ID.set(id,item);resources.set(id,asset);if(bitmap)bitmaps.set(id,bitmap);
}
export function unregisterAsset(id){const i=BY_ID.get(id)?.index;if(i!==CATALOG.length-1||!resources.has(id))throw Error('资源回滚顺序错误');const item=CATALOG.pop();CATEGORIES[item.category].count--;BY_ID.delete(id);resources.delete(id);bitmaps.get(id)?.close();bitmaps.delete(id);}
export function resourceRegistry(id){const asset=resources.get(id);if(!asset)return null;
 const catalog=CATALOG.map(p=>p.id===id?{...p,definition:asset.definition}:p);
 let vector=asset.libraries['vector-v1']??'';
 vector=vector.replace(/\{\{id:([A-Za-z]\w*)\}\}/g,(_,name)=>name===asset.definition.id?BY_ID.get(id).index:(BY_ID.get(name)?.index??-999));
 return {catalog,sources:{},libraries:asset.libraries,vector};
}
export async function ensureAssetImages(ids){for(const id of ids){const a=resources.get(id);if(a?.kind==='image'&&!bitmaps.has(id))bitmaps.set(id,await prepareAsset(a));}}
export async function restoreAssets(){
 const stored=await readResources();if(!Array.isArray(stored))throw Error('本地图形列表无效');
 for(const [id,asset] of stored){if(id!=='asset_'+await contentHash(asset))throw Error('本地资源标识不匹配');validateAsset(asset);registerAsset(id,asset);}
 const used=new Set();function visit(n){if(!n)return;if(n.kind==='shape')used.add(n.type);if(n.packDensity){used.add(n.packDensity.base);for(const id of n.packDensity.keys)used.add(id);}if(n.arrange?.[0]===12){used.add(CATALOG[n.arrange[39]]?.id);for(const key of n.tracks?.['arrange.39']?.keys??[])used.add(CATALOG[key[1]]?.id);}for(const c of n.children??[])visit(c);visit(n.mask);}
 try{const draft=JSON.parse(localStorage.getItem('momo-texture-tree:draft:v1')||'null');visit(draft?.root);for(const e of draft?.projectResources??[])visit(e.root);}catch{}
 try{const shelf=JSON.parse(localStorage.getItem(GRAPHIC_LIST_KEY)||'null');for(const e of shelf?.projectResources??[])visit(e.root);}catch{}
 await ensureAssetImages(used);
}
