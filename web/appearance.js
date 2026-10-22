// User preferences never enter a canvas, its undo history, or resource identity.
export const APPEARANCE_KEY='momo-texture-appearance:v1';
export const THEME_IDS=Object.freeze(['system','classic','graphite','light']);
export const STYLE_IDS=Object.freeze(['standard','minimal','soft']);
export const DENSITY_IDS=Object.freeze(['compact','comfortable']);
const palettes={classic:{accent:'#dfae72',panel:'#1e2229',text:'#e5e9ef'},graphite:{accent:'#8ab4f8',panel:'#262729',text:'#eceeef'},light:{accent:'#3866af',panel:'#ffffff',text:'#242b35'}};
export function normalizeAppearance(value){
 const theme=THEME_IDS.includes(value?.theme)?value.theme:'classic';
 const accent=typeof value?.accent==='string'&&/^#[a-f\d]{6}$/i.test(value.accent)?value.accent.toLowerCase():null;
 const style=STYLE_IDS.includes(value?.style)?value.style:'standard',density=DENSITY_IDS.includes(value?.density)?value.density:'compact';
 return {theme,accent,style,density};
}
const rgb=hex=>[1,3,5].map(at=>parseInt(hex.slice(at,at+2),16));
const mix=(a,b,amount)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-amount)+rgb(b)[i]*amount).toString(16).padStart(2,'0')).join('');
function luminance(hex){const [r,g,b]=rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;}
export function colorContrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (values[1]+.05)/(values[0]+.05);}
export function appearancePalette(preferences,dark=false){
 const value=normalizeAppearance(preferences),theme=value.theme==='system'?(dark?'classic':'light'):value.theme;
 const base=palettes[theme],accent=value.accent??base.accent;
 const onAccent=colorContrast(accent,'#ffffff')>=colorContrast(accent,'#000000')?'#ffffff':'#000000';
 let accentText=accent;
 for(let i=1;colorContrast(accentText,base.panel)<4.5&&i<=20;i++)accentText=mix(accent,base.text,i/20);
 return {theme,accent,onAccent,accentText,selected:mix(base.panel,accent,theme==='light'?.12:.20),hover:mix(accent,onAccent==='#ffffff'?'#000000':'#ffffff',.10)};
}
export function createAppearance({storage,root,media}={}){
 let preferences;try{preferences=normalizeAppearance(JSON.parse(storage?.getItem(APPEARANCE_KEY)??'null'));}catch{preferences=normalizeAppearance(null);}
 const listeners=new Set();
 function render(){
  const palette=appearancePalette(preferences,media?.matches);
  if(root){root.dataset.theme=palette.theme;root.dataset.interfaceStyle=preferences.style;root.dataset.density=preferences.density;root.style.colorScheme=palette.theme==='light'?'light':'dark';
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
