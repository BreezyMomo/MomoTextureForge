// User preferences never enter a canvas, its undo history, or resource identity.
export const APPEARANCE_KEY='momo-workbench:appearance:v1';
export const PRESET_THEME_IDS=Object.freeze(['xuanhei','shuimo','yuebai','qingci','qinghua','mineral','ouhe']);
export const THEME_IDS=PRESET_THEME_IDS;
export const COLOR_ROLE_IDS=Object.freeze(['action','selection','navigation','control']);
export const STYLE_IDS=Object.freeze(['standard','refined','airy','minimal','soft','aurora','pulse','cinema','candy']);
export const DENSITY_IDS=Object.freeze(['compact','comfortable']);
export const TAB_STYLE_IDS=Object.freeze(['classic','segmented','pill','underline']);
const defaultTabs={standard:'classic',minimal:'classic',soft:'classic',refined:'segmented',airy:'segmented',aurora:'pill',pulse:'pill',cinema:'underline',candy:'pill'};
const surfaceKeys=['bg','inset','panel','surface','hover','line','line-strong','text','muted','subtle'];
const skin=(accent,values)=>({accent,surfaces:Object.fromEntries(surfaceKeys.map((key,i)=>[key,values[i]]))});
// Complete themes assign the palette to areas, not just small accents. Mode
// is an internal contrast environment, never a second user-facing choice.
const themeSkin=(mode,accent,values,header,interaction,selection=interaction)=>({mode,...skin(accent,values),roles:{header,selection,navigation:interaction,control:interaction}});
const themes={
 shuimo:themeSkin('classic','#ef795b',['#20252b','#252d35','#303740','#39434d','#46525f','#505f6d','#91a0ae','#f1f2f4','#c5ced8','#b0bdca'],'#344e5c','#bbdce5','#e7c28b'),
 xuanhei:themeSkin('classic','#c5a36a',['#101010','#181818','#222222','#2c2c2c','#393939','#454545','#858585','#ededeb','#bcbcb8','#a6a6a1'],'#292929','#d2cec4','#d7bb82'),
 yuebai:themeSkin('light','#416d83',['#e0e5e8','#edf0f2','#fafcfc','#edf1f3','#d8e1e6','#a5b3bc','#788994','#293c46','#4f626a','#5c6c72'],'#bfcfd5','#345d73','#77603c'),
 qingci:themeSkin('light','#926c30',['#dce4de','#e9efea','#fbfcf8','#edf1ea','#d7e2d8','#a6b6aa','#798e7e','#293e35','#476251','#59705d'],'#b5cbbd','#305e51','#795b2a'),
 qinghua:themeSkin('light','#27678b',['#dfe6ed','#eaf0f5','#fcfcfa','#edf1f6','#d6e2ed','#a3b3c5','#788da4','#263e4a','#496571','#5b717b'],'#b2c7dc','#235b7d','#376653'),
 mineral:themeSkin('light','#a95736',['#e7e1d5','#f0ece4','#fcfaf5','#f0ece3','#e3ddcf','#b8ac98','#8e816b','#403c31','#625b48','#716851'],'#becbbf','#3a6259','#805b27'),
 ouhe:themeSkin('light','#ad653f',['#e8dfe4','#f0e9ed','#fdfbf9','#f0ebef','#e1d9e4','#b5a7b4','#8b7e8f','#34404b','#53606b','#626b75'],'#c8bed5','#655078','#655078')
};
const literalColor=value=>typeof value==='string'&&/^#[a-f\d]{6}$/i.test(value)?value.toLowerCase():null;
export const defaultAppearanceColors=()=>Object.fromEntries(COLOR_ROLE_IDS.map(role=>[role,null]));
const copyPreferences=value=>({...value,colors:{...value.colors}});
export function normalizeAppearance(value){
 const theme=THEME_IDS.includes(value?.theme)?value.theme:'xuanhei';
 const style=STYLE_IDS.includes(value?.style)?value.style:'refined',density=DENSITY_IDS.includes(value?.density)?value.density:'compact';
 const tabs=TAB_STYLE_IDS.includes(value?.tabs)?value.tabs:defaultTabs[style];
 const colors=defaultAppearanceColors();for(const role of COLOR_ROLE_IDS)colors[role]=literalColor(value?.colors?.[role]);
 return {theme,style,density,tabs,colors};
}
const rgb=hex=>[1,3,5].map(at=>parseInt(hex.slice(at,at+2),16));
const mix=(a,b,amount)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-amount)+rgb(b)[i]*amount).toString(16).padStart(2,'0')).join('');
const onColor=color=>colorContrast(color,'#ffffff')>=colorContrast(color,'#000000')?'#ffffff':'#000000';
function readableColor(color,background,text,tint=0){let result=color;for(let i=1;colorContrast(result,mix(background,result,tint))<4.5&&i<=20;i++)result=mix(color,text,i/20);return result;}
function luminance(hex){const [r,g,b]=rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;}
export function colorContrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (values[1]+.05)/(values[0]+.05);}
export function appearancePalette(preferences){
 const value=normalizeAppearance(preferences),id=value.theme;
 const variant=themes[id],theme=variant.mode,surfaces={...variant.surfaces};
 const backgrounds=['bg','inset','panel','surface','hover'];
 for(const key of ['muted','subtle'])for(const bg of backgrounds)surfaces[key]=readableColor(surfaces[key],surfaces[bg],surfaces.text);
 const base={accent:variant.accent,panel:surfaces.panel,text:surfaces.text},accent=value.colors.action??base.accent;
 const onAccent=onColor(accent),accentText=readableColor(accent,base.panel,base.text);
 const roles={...variant.roles};
 const tint=theme==='light'?.12:.18;
 for(const role of ['selection','navigation','control']){roles[role]=value.colors[role]??roles[role];for(const bg of ['panel','bg','inset'])roles[role]=readableColor(roles[role],surfaces[bg],base.text,tint);}
 roles.stage='#20242a';
 roles['header-text']=readableColor(surfaces.text,roles.header,theme==='light'?'#17222a':'#ffffff');
 roles['header-muted']=readableColor(surfaces.muted,roles.header,roles['header-text']);
 roles['header-navigation']=readableColor(roles.navigation,roles.header,theme==='light'?'#17222a':'#ffffff',tint);
 roles['header-navigation-bg']=mix(roles.header,roles['header-navigation'],tint);
 roles['section']=mix(surfaces.panel,roles.header,.22);
 const roleSurfaces=Object.fromEntries(['selection','navigation','control'].map(role=>[role,mix(base.panel,roles[role],tint)]));
 return {id,theme,accent,onAccent,accentText,selected:roleSurfaces.selection,roleSurfaces,hover:mix(accent,onAccent==='#ffffff'?'#000000':'#ffffff',.10),surfaces:{...surfaces},roles,colors:{action:accent,selection:roles.selection,navigation:roles.navigation,control:roles.control}};
}
export function createAppearance({storage,root,storageKey,appId}={}){
 const key=storageKey??(appId?`${appId}:appearance:v1`:APPEARANCE_KEY);
 let preferences;try{preferences=normalizeAppearance(JSON.parse(storage?.getItem(key)??'null'));}catch{preferences=normalizeAppearance(null);}
 const listeners=new Set();
 function render(){
  const palette=appearancePalette(preferences);
  if(root){root.dataset.momoWorkbench='true';root.dataset.theme=palette.theme;root.dataset.appearanceTheme=palette.id;root.dataset.paletteRoles='true';root.dataset.interfaceStyle=preferences.style;root.dataset.density=preferences.density;root.dataset.tabStyle=preferences.tabs;root.dataset.tabOverride='true';root.style.colorScheme=palette.theme==='light'?'light':'dark';
   for(const key of surfaceKeys){if(palette.surfaces)root.style.setProperty('--ui-'+key,palette.surfaces[key]);else root.style.removeProperty?.('--ui-'+key);}
   for(const [key,value]of Object.entries({accent:palette.accent,'on-accent':palette.onAccent,'accent-text':palette.accentText,selected:palette.selected,'accent-hover':palette.hover}))root.style.setProperty('--ui-'+key,value);
   const roles=palette.roles,roleTokens=roles?{...roles,'on-navigation':onColor(roles.navigation),'on-control':onColor(roles.control),'on-selection':onColor(roles.selection),'navigation-bg':palette.roleSurfaces.navigation,'control-bg':palette.roleSurfaces.control,'selection-surface':palette.selected,'selection-line':mix(palette.surfaces.panel,roles.selection,.55)}:{};
   for(const key of ['selection','navigation','control','header','stage','header-text','header-muted','header-navigation','header-navigation-bg','section','on-navigation','on-control','on-selection','navigation-bg','control-bg','selection-surface','selection-line']){if(roles)root.style.setProperty('--ui-'+key,roleTokens[key]);else root.style.removeProperty?.('--ui-'+key);}
  }
  for(const listener of listeners)listener(copyPreferences(preferences),palette);
 }
 function preview(value){preferences=normalizeAppearance(value);render();}
 function save(value){preview(value);try{if(!storage)return false;storage.setItem(key,JSON.stringify(preferences));return true;}catch{return false;}}
 render();
 return {get:()=>copyPreferences(preferences),palette:()=>appearancePalette(preferences),preview,save,subscribe(fn){listeners.add(fn);return ()=>{listeners.delete(fn);};},dispose(){listeners.clear();}};
}
