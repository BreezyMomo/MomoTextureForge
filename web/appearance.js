// User preferences never enter a canvas, its undo history, or resource identity.
export const APPEARANCE_KEY='momo-texture-appearance:v1';
export const THEME_IDS=Object.freeze(['system','classic','graphite','light']);
export const COLOR_SCHEME_IDS=Object.freeze(['shuimo','qingci','mineral','xuanqing','zhuyue','ouhe']);
export const GROUPED_SCHEME_IDS=COLOR_SCHEME_IDS;
export const COLOR_ROLE_IDS=Object.freeze(['action','selection','navigation','control']);
export const STYLE_IDS=Object.freeze(['standard','refined','airy','minimal','soft','aurora','pulse','cinema','candy']);
export const DENSITY_IDS=Object.freeze(['compact','comfortable']);
export const TAB_STYLE_IDS=Object.freeze(['classic','segmented','pill','underline']);
const defaultTabs={standard:'classic',minimal:'classic',soft:'classic',refined:'segmented',airy:'segmented',aurora:'pill',pulse:'pill',cinema:'underline',candy:'pill'};
const surfaceKeys=['bg','inset','panel','surface','hover','line','line-strong','text','muted','subtle'];
const skin=(accent,values)=>({accent,surfaces:Object.fromEntries(surfaceKeys.map((key,i)=>[key,values[i]]))});
const groupedSkin=(accent,values,selection,navigation,control,header,stage)=>({...skin(accent,values),roles:{selection,navigation,control,header,stage}});
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
 xuanqing:{dark:groupedSkin('#8ac9be',['#101c22','#132027','#17272d','#21353c','#2d454d','#3a5259','#738e91','#e4eeeb','#b0c4be','#95aaa7'],'#dbbf7c','#a6b9e8','#9fc7bd','#152a37','#1a2024'),light:groupedSkin('#2d6b64',['#e8efec','#f2f6f2','#f8faf6','#e0e9e3','#d3e0d9','#bbcfc4','#6e8b80','#243c3d','#4d665f','#5d786d'],'#7a5e25','#505f90','#3c6b68','#dce5e8','#e9edef')},
 zhuyue:{dark:groupedSkin('#a6c78d',['#17221d','#1b2922','#223229','#2c4236','#3a5544','#445f4e','#809b83','#e7efe0','#b9cbb0','#9eb492'],'#ddbd86','#9fc6d5','#bec78e','#192e2e','#1a2024'),light:groupedSkin('#4c6d3f',['#eef1e5','#f5f7ee','#fafbf4','#e6ecd9','#d9e3c7','#c2ceb0','#7c9066','#2d3b2b','#56674d','#68785b'],'#80602d','#3d6c7f','#68743b','#e5eadf','#e9edef')},
 ouhe:{dark:groupedSkin('#d4b2ce',['#241f2a','#2c2533','#332c3b','#453a4d','#574963','#62516c','#a18aa9','#f5eaf1','#cfbbcd','#b39cb0'],'#dec58f','#9dbfdb','#bdb3e3','#252b3c','#1a2024'),light:groupedSkin('#875584',['#f2edf3','#f8f4f8','#fffafd','#efe4ed','#e4d5e1','#cfbbcd','#9b7d97','#403144','#6d586d','#846c83'],'#7d5c2b','#47647d','#6e5b91','#e7e6ef','#e9edef')}
};
const neutralSurfaces=skin(null,['#1c1d1f','#202123','#262729','#303234','#3c3f43','#41454a','#727981','#eceeef','#b3b9c2','#929aa7']).surfaces;
const literalColor=value=>typeof value==='string'&&/^#[a-f\d]{6}$/i.test(value)?value.toLowerCase():null;
export const defaultAppearanceColors=()=>Object.fromEntries(COLOR_ROLE_IDS.map(role=>[role,null]));
const copyPreferences=value=>({...value,colors:{...value.colors}});
export function normalizeAppearance(value){
 const theme=THEME_IDS.includes(value?.theme)?value.theme:'classic';
 const style=STYLE_IDS.includes(value?.style)?value.style:THEME_IDS.includes(value?.theme)?'standard':'refined',density=DENSITY_IDS.includes(value?.density)?value.density:'compact';
 // Resolve historical automatic choices once. Live edits always carry explicit
 // scheme/tab IDs, so changing a control style cannot change either choice.
 const tabs=TAB_STYLE_IDS.includes(value?.tabs)?value.tabs:value?.tabs==='auto'||value?.tabs===undefined?defaultTabs[style]:'segmented';
 const aliases={tianqing:'qingci',dunhuang:'mineral',zhusha:'shuimo'};
 let scheme=COLOR_SCHEME_IDS.includes(value?.scheme)?value.scheme:Object.hasOwn(aliases,value?.scheme)?aliases[value.scheme]:null;
 if(!scheme)scheme=(value?.scheme==='auto'||!value?.scheme)&&THEME_IDS.includes(value?.theme)?({aurora:'ouhe',pulse:'zhuyue',candy:'ouhe',cinema:'shuimo'}[style]??(theme==='light'?'qingci':theme==='graphite'?'xuanqing':'mineral')):'shuimo';
 const colors=defaultAppearanceColors();for(const role of COLOR_ROLE_IDS)colors[role]=literalColor(value?.colors?.[role]);
 if(!value?.colors||!Object.hasOwn(value.colors,'action'))colors.action=literalColor(value?.accent);
 return {theme,style,density,tabs,scheme,colors};
}
const rgb=hex=>[1,3,5].map(at=>parseInt(hex.slice(at,at+2),16));
const mix=(a,b,amount)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-amount)+rgb(b)[i]*amount).toString(16).padStart(2,'0')).join('');
const onColor=color=>colorContrast(color,'#ffffff')>=colorContrast(color,'#000000')?'#ffffff':'#000000';
function readableColor(color,background,text,tint=0){let result=color;for(let i=1;colorContrast(result,mix(background,result,tint))<4.5&&i<=20;i++)result=mix(color,text,i/20);return result;}
function luminance(hex){const [r,g,b]=rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;}
export function colorContrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (values[1]+.05)/(values[0]+.05);}
export function appearancePalette(preferences,dark=false){
 const value=normalizeAppearance(preferences),theme=value.theme==='system'?(dark?'classic':'light'):value.theme;
 const variant=colorSchemes[value.scheme][theme==='light'?'light':'dark'];
 const surfaces=theme==='graphite'?Object.fromEntries(Object.entries(variant.surfaces).map(([key,color])=>[key,mix(color,neutralSurfaces[key],.5)])):variant.surfaces;
 const base={accent:variant.accent,panel:surfaces.panel,text:surfaces.text},accent=value.colors.action??base.accent;
 const onAccent=onColor(accent),accentText=readableColor(accent,base.panel,base.text);
 const roles={...variant.roles};
 for(const role of ['selection','navigation','control'])roles[role]=readableColor(value.colors[role]??roles[role],base.panel,base.text,role==='control'?0:theme==='light'?.12:role==='navigation'?.18:.20);
 if(theme==='graphite')roles.header=mix(roles.header,neutralSurfaces.inset,.5);
 return {theme,accent,onAccent,accentText,selected:mix(base.panel,roles.selection,theme==='light'?.12:.20),hover:mix(accent,onAccent==='#ffffff'?'#000000':'#ffffff',.10),surfaces:{...surfaces},roles,colors:{action:accent,selection:roles.selection,navigation:roles.navigation,control:roles.control}};
}
export function createAppearance({storage,root,media}={}){
 let preferences;try{preferences=normalizeAppearance(JSON.parse(storage?.getItem(APPEARANCE_KEY)??'null'));}catch{preferences=normalizeAppearance(null);}
 const listeners=new Set();
 function render(){
  const palette=appearancePalette(preferences,media?.matches);
  if(root){root.dataset.theme=palette.theme;root.dataset.colorScheme=preferences.scheme;root.dataset.paletteRoles='true';root.dataset.interfaceStyle=preferences.style;root.dataset.density=preferences.density;root.dataset.tabStyle=preferences.tabs;root.dataset.tabOverride='true';root.style.colorScheme=palette.theme==='light'?'light':'dark';
   for(const key of surfaceKeys){if(palette.surfaces)root.style.setProperty('--ui-'+key,palette.surfaces[key]);else root.style.removeProperty?.('--ui-'+key);}
   for(const [key,value]of Object.entries({accent:palette.accent,'on-accent':palette.onAccent,'accent-text':palette.accentText,selected:palette.selected,'accent-hover':palette.hover}))root.style.setProperty('--ui-'+key,value);
   const roles=palette.roles,roleTokens=roles?{...roles,'on-navigation':onColor(roles.navigation),'navigation-bg':mix(palette.surfaces.panel,roles.navigation,palette.theme==='light'?.12:.18),'selection-surface':palette.selected,'selection-line':mix(palette.surfaces.panel,roles.selection,.55)}:{};
   for(const key of ['selection','navigation','control','header','stage','on-navigation','navigation-bg','selection-surface','selection-line']){if(roles)root.style.setProperty('--ui-'+key,roleTokens[key]);else root.style.removeProperty?.('--ui-'+key);}
  }
  for(const listener of listeners)listener(copyPreferences(preferences),palette);
 }
 function preview(value){preferences=normalizeAppearance(value);render();}
 function save(value){preview(value);try{if(!storage)return false;storage.setItem(APPEARANCE_KEY,JSON.stringify(preferences));return true;}catch{return false;}}
 const onSystemChange=()=>{if(preferences.theme==='system')render();};media?.addEventListener?.('change',onSystemChange);render();
 return {get:()=>copyPreferences(preferences),palette:()=>appearancePalette(preferences,media?.matches),preview,save,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},dispose(){media?.removeEventListener?.('change',onSystemChange);listeners.clear();}};
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const appearance=globalThis.document?createAppearance({storage,root:document.documentElement,media:globalThis.matchMedia?.('(prefers-color-scheme: dark)')}):null;
