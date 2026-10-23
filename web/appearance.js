// User preferences never enter a canvas, its undo history, or resource identity.
export const APPEARANCE_KEY='momo-texture-appearance:v1';
export const THEME_IDS=Object.freeze(['system','classic','graphite','light']);
export const GROUPED_SCHEME_IDS=Object.freeze(['shuimo','qingci','mineral']);
export const COLOR_SCHEME_IDS=Object.freeze(['auto',...GROUPED_SCHEME_IDS,'xuanqing','tianqing','dunhuang','zhusha','zhuyue','ouhe']);
export const STYLE_IDS=Object.freeze(['standard','refined','airy','minimal','soft','aurora','pulse','cinema','candy']);
export const DENSITY_IDS=Object.freeze(['compact','comfortable']);
export const TAB_STYLE_IDS=Object.freeze(['auto','classic','segmented','pill','underline']);
const defaultTabs={standard:'classic',minimal:'classic',soft:'classic',refined:'segmented',airy:'segmented',aurora:'pill',pulse:'pill',cinema:'underline',candy:'pill'};
const palettes={classic:{accent:'#dfae72',panel:'#1e2229',text:'#e5e9ef'},graphite:{accent:'#8ab4f8',panel:'#262729',text:'#eceeef'},light:{accent:'#3866af',panel:'#ffffff',text:'#242b35'}};
const surfaceKeys=['bg','inset','panel','surface','hover','line','line-strong','text','muted','subtle'];
const skin=(accent,values)=>({accent,surfaces:Object.fromEntries(surfaceKeys.map((key,i)=>[key,values[i]]))});
const groupedSkin=(accent,values,selection,navigation,control,header,stage)=>({...skin(accent,values),roles:{selection,navigation,control,header,stage}});
// These palettes belong to UI chrome only. Existing styles still use their exact palettes.
const skins={
 aurora:{dark:skin('#b5a0ff',['#0d1020','#101425','#151a2d','#232a43','#303952','#343d59','#68769b','#edf0ff','#b3bdd8','#94a2c3']),light:skin('#7651d2',['#f0eefb','#f6f4fe','#ffffff','#f0edfa','#e5dff8','#d7d0ec','#8b7cab','#28233d','#635b79','#75698b'])},
 pulse:{dark:skin('#77e5a0',['#0d100e','#121613','#191f1b','#27312b','#35433a','#34473b','#6c8a75','#f0f8f2','#b5c8bb','#94ac9d']),light:skin('#267347',['#edf5ef','#f3faf5','#ffffff','#eaf4ed','#d9eddf','#cadfd0','#74917d','#1b3021','#526d5b','#66826e'])},
 cinema:{dark:skin('#eeeef2',['#08090b','#0e0f12','#141518','#202126','#2b2d33','#303239','#747883','#f2f2f5','#b9bbc5','#969ba8']),light:skin('#303138',['#eceef1','#f4f5f7','#ffffff','#f0f1f4','#e1e3e8','#d0d3db','#858994','#23242b','#5c606c','#717583'])},
 candy:{dark:skin('#f3a2cb',['#1b1420','#221927','#2b2031','#3b2b43','#4e3b55','#54405c','#987da2','#fff0fb','#d4b8d6','#b99abd']),light:skin('#ad3d79',['#faf0f6','#fdf5fa','#fffafd','#f6e9f2','#eed9e8','#e2cbdc','#ad7c9c','#382338','#795a75','#8f6b88'])}
};
// Modern interface palettes inspired by traditional colors, each with light/dark roles.
const colorSchemes={
 shuimo:{
  dark:groupedSkin('#ef795b',['#141b20','#182329','#22272b','#2d353a','#39464b','#414e52','#809599','#f1eee6','#c0cac8','#a4b4b2'],'#dec286','#91c4ce','#93c5b4','#182b32','#1a1e23'),
  light:groupedSkin('#b7412b',['#e8edeb','#edf3f0','#faf8f2','#e7eeeb','#d8e3df','#bdcdc6','#718a83','#263a3e','#4d6466','#607573'],'#7e602a','#356d7c','#356e62','#dce8e5','#e9edef')
 },
 qingci:{
  dark:groupedSkin('#82c7b4',['#132222','#182a29','#1e302f','#2b403b','#37534b','#426258','#7e9e8e','#f0f2e5','#c1d1c4','#a4baab'],'#e5c47e','#abc3e1','#94cfbd','#182c35','#1a2024'),
  light:groupedSkin('#286d61',['#e9eee6','#f1f4eb','#fcfbf2','#e8eddf','#dbe4d2','#c3cfb8','#7e9276','#2b3e35','#526651','#5e7058'],'#7e5e24','#4b658b','#346f64','#e0e9e8','#e9edef')
 },
 mineral:{
  dark:groupedSkin('#e69a70',['#211e20','#28272b','#302e2b','#3e3c36','#4c4a41','#625c50','#a3947c','#f5ebd9','#d0c4ac','#b9aa8e'],'#e3c775','#87c4cc','#a7c39b','#202f39','#1d2025'),
  light:groupedSkin('#a44f2e',['#eee7d9','#f3eddf','#fcf7e9','#ece2cc','#ded4ba','#cabd9e','#938166','#423a2e','#655944','#7b6a51'],'#7c6124','#346d7a','#4e7052','#dde8e6','#e9edef')
 },
 xuanqing:{dark:skin('#8ac9be',['#101c22','#132027','#17272d','#21353c','#2d454d','#3a5259','#738e91','#e4eeeb','#b0c4be','#95aaa7']),light:skin('#2d6b64',['#e8efec','#f2f6f2','#f8faf6','#e0e9e3','#d3e0d9','#bbcfc4','#6e8b80','#243c3d','#4d665f','#5d786d'])},
 tianqing:{dark:skin('#9acfd5',['#111e25','#16252e','#1b2e37','#29404a','#354f5b','#3f5b66','#7597a0','#edf5f4','#b6ced1','#99b6bc']),light:skin('#346b7b',['#ecf2f2','#f3f7f6','#fbfcf8','#e3eded','#d3e3e3','#c0d3d2','#738e8d','#2a3e43','#4e666b','#60787c'])},
 dunhuang:{dark:skin('#d3b77b',['#221f1b','#27241f','#2c2924','#39352d','#494336','#625b4c','#9c8b6c','#eee5d6','#c6b9a2','#aa9c83']),light:skin('#856329',['#efe8dc','#f7f1e6','#fcf7ec','#eae0ce','#ded0b7','#cebea1','#938069','#433a2f','#655745','#7f6f53'])},
 zhusha:{dark:skin('#e6a397',['#251c1e','#2c2123','#332729','#443335','#574246','#63494d','#a27b7b','#f5e8e0','#cfb5ad','#b8968e']),light:skin('#9e4039',['#eee8e1','#f6f0e8','#fcf8f2','#eee4da','#e4d5c8','#cdbbad','#9a7e6b','#433a37','#695a52','#836d63'])},
 zhuyue:{dark:skin('#a6c78d',['#17221d','#1b2922','#223229','#2c4236','#3a5544','#445f4e','#809b83','#e7efe0','#b9cbb0','#9eb492']),light:skin('#4c6d3f',['#eef1e5','#f5f7ee','#fafbf4','#e6ecd9','#d9e3c7','#c2ceb0','#7c9066','#2d3b2b','#56674d','#68785b'])},
 ouhe:{dark:skin('#d4b2ce',['#241f2a','#2c2533','#332c3b','#453a4d','#574963','#62516c','#a18aa9','#f5eaf1','#cfbbcd','#b39cb0']),light:skin('#875584',['#f2edf3','#f8f4f8','#fffafd','#efe4ed','#e4d5e1','#cfbbcd','#9b7d97','#403144','#6d586d','#846c83'])}
};
const neutralSurfaces=skin(null,['#1c1d1f','#202123','#262729','#303234','#3c3f43','#41454a','#727981','#eceeef','#b3b9c2','#929aa7']).surfaces;
export function normalizeAppearance(value){
 const theme=THEME_IDS.includes(value?.theme)?value.theme:'classic';
 const accent=typeof value?.accent==='string'&&/^#[a-f\d]{6}$/i.test(value.accent)?value.accent.toLowerCase():null;
 const style=STYLE_IDS.includes(value?.style)?value.style:THEME_IDS.includes(value?.theme)?'standard':'refined',density=DENSITY_IDS.includes(value?.density)?value.density:'compact';
 const tabs=TAB_STYLE_IDS.includes(value?.tabs)?value.tabs:'auto';
 const scheme=COLOR_SCHEME_IDS.includes(value?.scheme)?value.scheme:'auto';
 return {theme,accent,style,density,tabs,scheme};
}
const rgb=hex=>[1,3,5].map(at=>parseInt(hex.slice(at,at+2),16));
const mix=(a,b,amount)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-amount)+rgb(b)[i]*amount).toString(16).padStart(2,'0')).join('');
const onColor=color=>colorContrast(color,'#ffffff')>=colorContrast(color,'#000000')?'#ffffff':'#000000';
function readableColor(color,background,text){let result=color;for(let i=1;colorContrast(result,background)<4.5&&i<=20;i++)result=mix(color,text,i/20);return result;}
function luminance(hex){const [r,g,b]=rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;}
export function colorContrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (values[1]+.05)/(values[0]+.05);}
export function appearancePalette(preferences,dark=false){
 const value=normalizeAppearance(preferences),theme=value.theme==='system'?(dark?'classic':'light'):value.theme;
 const variant=(colorSchemes[value.scheme]??skins[value.style])?.[theme==='light'?'light':'dark'];
 const surfaces=variant&&(theme==='graphite'?Object.fromEntries(Object.entries(variant.surfaces).map(([key,color])=>[key,mix(color,neutralSurfaces[key],.5)])):variant.surfaces);
 const base=variant?{accent:variant.accent,panel:surfaces.panel,text:surfaces.text}:palettes[theme],accent=value.accent??base.accent;
 const onAccent=onColor(accent),accentText=readableColor(accent,base.panel,base.text);
 const roles=variant?.roles&&{...variant.roles};
 if(roles){for(const role of ['selection','navigation','control'])roles[role]=readableColor(roles[role],base.panel,base.text);if(theme==='graphite')roles.header=mix(roles.header,neutralSurfaces.inset,.5);}
 return {theme,accent,onAccent,accentText,selected:mix(base.panel,roles?.selection??accent,theme==='light'?.12:.20),hover:mix(accent,onAccent==='#ffffff'?'#000000':'#ffffff',.10),...(variant?{surfaces:{...surfaces}}:{}),...(roles?{roles}:{})};
}
export function createAppearance({storage,root,media}={}){
 let preferences;try{preferences=normalizeAppearance(JSON.parse(storage?.getItem(APPEARANCE_KEY)??'null'));}catch{preferences=normalizeAppearance(null);}
 const listeners=new Set();
 function render(){
  const palette=appearancePalette(preferences,media?.matches);
  if(root){root.dataset.theme=palette.theme;root.dataset.colorScheme=preferences.scheme;root.dataset.paletteRoles=String(!!palette.roles);root.dataset.interfaceStyle=preferences.style;root.dataset.density=preferences.density;root.dataset.tabStyle=preferences.tabs==='auto'?defaultTabs[preferences.style]:preferences.tabs;root.dataset.tabOverride=String(preferences.tabs!=='auto');root.style.colorScheme=palette.theme==='light'?'light':'dark';
   for(const key of surfaceKeys){if(palette.surfaces)root.style.setProperty('--ui-'+key,palette.surfaces[key]);else root.style.removeProperty?.('--ui-'+key);}
   for(const [key,value]of Object.entries({accent:palette.accent,'on-accent':palette.onAccent,'accent-text':palette.accentText,selected:palette.selected,'accent-hover':palette.hover}))root.style.setProperty('--ui-'+key,value);
   const roles=palette.roles,roleTokens=roles?{...roles,'on-navigation':onColor(roles.navigation),'navigation-bg':mix(palette.surfaces.panel,roles.navigation,palette.theme==='light'?.12:.18),'selection-surface':palette.selected,'selection-line':mix(palette.surfaces.panel,roles.selection,.55)}:{};
   for(const key of ['selection','navigation','control','header','stage','on-navigation','navigation-bg','selection-surface','selection-line']){if(roles)root.style.setProperty('--ui-'+key,roleTokens[key]);else root.style.removeProperty?.('--ui-'+key);}
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
