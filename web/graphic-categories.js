import {BY_ID,CATEGORIES} from './catalog.js';
import {categoryLabel} from './graphic-label.js';
import {UI_CATALOGS} from './locales/catalogs.js';

// Built-in copies follow the catalog, including copies saved under older names.
// Presentation only: resource identities, personal edits and saved projects stay intact.
const legacyBuiltinCategories=new Set(['径向','形状','图案','渐变','噪声','自然材质','数字','能量','矢量场','遮罩','拖尾','法阵','特效素材','Radial','Shapes','Patterns','Gradient','Noise','Natural materials','Digital','Energy','Vector fields','Mask','Trails','Sigils','VFX textures']);
function categoryBuiltin(entry){
 const explicit=BY_ID.get(entry.builtin);if(explicit)return explicit;
 // Early shelves have no builtin marker. Use the actual shape type and an old
 // system category, never the displayed name; custom categories and assets stay owned.
 const type=entry.root?.type;
 return entry.resourceId&&entry.kind!=='image'&&entry.root?.kind==='shape'&&!type?.startsWith('asset_')&&legacyBuiltinCategories.has(entry.category)?BY_ID.get(type):undefined;
}
export const graphicCategory=entry=>categoryBuiltin(entry)?.categoryName||(entry.category||'图形列表');
export function graphicCategorySearchText(entry){
 const builtin=categoryBuiltin(entry);
 const key=builtin?'categories.'+CATEGORIES[builtin.category].id+'.name':null;
 return [graphicCategory(entry),...(key?Object.values(UI_CATALOGS).map(catalog=>catalog[key]):[])].join(' ').toLocaleLowerCase();
}
export function graphicCategoryGroups(entries){
 const groups=new Map();
 for(const entry of entries){const key=graphicCategory(entry);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);}
 return [...groups].map(([key,members])=>{
  const builtin=categoryBuiltin(members[0]),index=builtin&&members.every(entry=>categoryBuiltin(entry)?.category===builtin.category)?builtin.category:-1;
  return {key,title:index>=0?categoryLabel(index):key,members,order:index>=0?index:CATEGORIES.length};
 }).sort((a,b)=>a.order-b.order);
}
