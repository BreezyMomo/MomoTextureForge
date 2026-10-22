// User preferences never enter a canvas, its undo history, or resource identity.
export const APPEARANCE_KEY='momo-texture-appearance:v1';
export const THEME_IDS=Object.freeze(['system','classic','graphite','light']);
export const STYLE_IDS=Object.freeze(['refined','standard','minimal','soft','aurora','pulse','cinema','candy']);
export const DENSITY_IDS=Object.freeze(['compact','comfortable']);
export const TAB_STYLE_IDS=Object.freeze(['auto','classic','segmented','pill','underline']);
const defaultTabs={standard:'classic',minimal:'classic',soft:'classic',refined:'segmented',aurora:'pill',pulse:'pill',cinema:'underline',candy:'pill'};
const palettes={classic:{accent:'#dfae72',panel:'#1e2229',text:'#e5e9ef'},graphite:{accent:'#8ab4f8',panel:'#262729',text:'#eceeef'},light:{accent:'#3866af',panel:'#ffffff',text:'#242b35'}};
const surfaceKeys=['bg','inset','panel','surface','hover','line','line-strong','text','muted','subtle'];
const skin=(accent,values)=>({accent,surfaces:Object.fromEntries(surfaceKeys.map((key,i)=>[key,values[i]]))});
// These palettes belong to UI chrome only. Existing styles still use their exact palettes.
const skins={
 aurora:{dark:skin('#b5a0ff',['#0d1020','#101425','#151a2d','#232a43','#303952','#343d59','#68769b','#edf0ff','#b3bdd8','#94a2c3']),light:skin('#7651d2',['#f0eefb','#f6f4fe','#ffffff','#f0edfa','#e5dff8','#d7d0ec','#8b7cab','#28233d','#635b79','#75698b'])},
 pulse:{dark:skin('#77e5a0',['#0d100e','#121613','#191f1b','#27312b','#35433a','#34473b','#6c8a75','#f0f8f2','#b5c8bb','#94ac9d']),light:skin('#267347',['#edf5ef','#f3faf5','#ffffff','#eaf4ed','#d9eddf','#cadfd0','#74917d','#1b3021','#526d5b','#66826e'])},
 cinema:{dark:skin('#eeeef2',['#08090b','#0e0f12','#141518','#202126','#2b2d33','#303239','#747883','#f2f2f5','#b9bbc5','#969ba8']),light:skin('#303138',['#eceef1','#f4f5f7','#ffffff','#f0f1f4','#e1e3e8','#d0d3db','#858994','#23242b','#5c606c','#717583'])},
 candy:{dark:skin('#f3a2cb',['#1b1420','#221927','#2b2031','#3b2b43','#4e3b55','#54405c','#987da2','#fff0fb','#d4b8d6','#b99abd']),light:skin('#ad3d79',['#faf0f6','#fdf5fa','#fffafd','#f6e9f2','#eed9e8','#e2cbdc','#ad7c9c','#382338','#795a75','#8f6b88'])}
};
const neutralSurfaces=skin(null,['#1c1d1f','#202123','#262729','#303234','#3c3f43','#41454a','#727981','#eceeef','#b3b9c2','#929aa7']).surfaces;
export function normalizeAppearance(value){
 const theme=THEME_IDS.includes(value?.theme)?value.theme:'classic';
 const accent=typeof value?.accent==='string'&&/^#[a-f\d]{6}$/i.test(value.accent)?value.accent.toLowerCase():null;
 const style=STYLE_IDS.includes(value?.style)?value.style:THEME_IDS.includes(value?.theme)?'standard':'refined',density=DENSITY_IDS.includes(value?.density)?value.density:'compact';
 const tabs=TAB_STYLE_IDS.includes(value?.tabs)?value.tabs:'auto';
 return {theme,accent,style,density,tabs};
}
const rgb=hex=>[1,3,5].map(at=>parseInt(hex.slice(at,at+2),16));
const mix=(a,b,amount)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-amount)+rgb(b)[i]*amount).toString(16).padStart(2,'0')).join('');
function luminance(hex){const [r,g,b]=rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;}
export function colorContrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (values[1]+.05)/(values[0]+.05);}
export function appearancePalette(preferences,dark=false){
 const value=normalizeAppearance(preferences),theme=value.theme==='system'?(dark?'classic':'light'):value.theme;
 const variant=skins[value.style]?.[theme==='light'?'light':'dark'];
 const surfaces=variant&&(theme==='graphite'?Object.fromEntries(Object.entries(variant.surfaces).map(([key,color])=>[key,mix(color,neutralSurfaces[key],.5)])):variant.surfaces);
 const base=variant?{accent:variant.accent,panel:surfaces.panel,text:surfaces.text}:palettes[theme],accent=value.accent??base.accent;
 const onAccent=colorContrast(accent,'#ffffff')>=colorContrast(accent,'#000000')?'#ffffff':'#000000';
 let accentText=accent;
 for(let i=1;colorContrast(accentText,base.panel)<4.5&&i<=20;i++)accentText=mix(accent,base.text,i/20);
 return {theme,accent,onAccent,accentText,selected:mix(base.panel,accent,theme==='light'?.12:.20),hover:mix(accent,onAccent==='#ffffff'?'#000000':'#ffffff',.10),...(variant?{surfaces:{...surfaces}}:{})};
}
export function createAppearance({storage,root,media}={}){
 let preferences;try{preferences=normalizeAppearance(JSON.parse(storage?.getItem(APPEARANCE_KEY)??'null'));}catch{preferences=normalizeAppearance(null);}
 const listeners=new Set();
 function render(){
  const palette=appearancePalette(preferences,media?.matches);
  if(root){root.dataset.theme=palette.theme;root.dataset.interfaceStyle=preferences.style;root.dataset.density=preferences.density;root.dataset.tabStyle=preferences.tabs==='auto'?defaultTabs[preferences.style]:preferences.tabs;root.dataset.tabOverride=String(preferences.tabs!=='auto');root.style.colorScheme=palette.theme==='light'?'light':'dark';
   for(const key of surfaceKeys){if(palette.surfaces)root.style.setProperty('--ui-'+key,palette.surfaces[key]);else root.style.removeProperty?.('--ui-'+key);}
   for(const [key,value]of Object.entries({accent:palette.accent,'on-accent':palette.onAccent,'accent-text':palette.accentText,selected:palette.selected,'accent-hover':palette.hover}))root.style.setProperty('--ui-'+key,value);
  }
  for(const listener of listeners)listener({...preferences},palette);
 }
 function preview(value){preferences=normalizeAppearance(value);render();}
 function save(value){preview(value);try{if(!storage)return false;storage.setItem(APPEARANCE_KEY,JSON.stringify(preferences));return true;}catch{return false;}}
 const onSystemChange=()=>{if(preferences.theme==='system')render();};media?.addEventListener?.('change',onSystemChange);render();
 return {get:()=>({...preferences}),palette:()=>appearancePalette(preferences,media?.matches),preview,save,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},dispose(){media?.removeEventListener?.('change',onSystemChange);listeners.clear();}};
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const appearance=globalThis.document?createAppearance({storage,root:document.documentElement,media:globalThis.matchMedia?.('(prefers-color-scheme: dark)')}):null;
