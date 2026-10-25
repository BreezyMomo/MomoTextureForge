import {appearance,THEME_IDS,STYLE_IDS,DENSITY_IDS,TAB_STYLE_IDS,COLOR_ROLE_IDS} from './appearance.js';
import {SUPPORTED_LANGUAGES,interfaceLanguage,setLanguage} from './language.js';

export const MATERIAL_DEFAULTS={model:0,lightAngle:.6,roughness:.4,metallic:0,tiling:1,orbit:[.35,-.2]};
export const EFFECT_DEFAULTS={background:'dark',blend:'compare',size:.8,brightness:1,color:'#53647a'};
export const preferenceOptions={themes:THEME_IDS,styles:STYLE_IDS,densities:DENSITY_IDS,tabs:TAB_STYLE_IDS,colorRoles:COLOR_ROLE_IDS,languages:SUPPORTED_LANGUAGES};
const number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const color=v=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v);
const material={model:v=>[0,1,2].includes(v),lightAngle:v=>number(v,-3.14,3.14),roughness:v=>number(v,0,1),metallic:v=>number(v,0,1),tiling:v=>Number.isInteger(v)&&number(v,1,4),orbit:v=>Array.isArray(v)&&v.length===2&&number(v[0],-100000,100000)&&number(v[1],-1.4,1.4),resetView:v=>typeof v==='boolean'};
const effect={background:v=>['dark','light','compare','custom'].includes(v),blend:v=>['compare','alpha','add'].includes(v),size:v=>number(v,.2,1),brightness:v=>number(v,0,3),color,reset:v=>typeof v==='boolean'};
const visual={theme:v=>THEME_IDS.includes(v),style:v=>STYLE_IDS.includes(v),density:v=>DENSITY_IDS.includes(v),tabs:v=>TAB_STYLE_IDS.includes(v),colors:v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,x])=>COLOR_ROLE_IDS.includes(k)&&(x===null||color(x)))};
export function validateEditorSettings(changes){
 for(const [key,rules]of [['material',material],['effect',effect],['appearance',visual]]){
  const value=changes[key];if(value===undefined)continue;
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.entries(value).some(([k,v])=>!rules[k]?.(v)))throw Error('Invalid '+key+' settings');
 }
 if(changes.language!==undefined&&!SUPPORTED_LANGUAGES.some(l=>l.code===changes.language))throw Error('Unsupported interface language');
}
export function editorPreferences(){return {language:interfaceLanguage(),appearance:appearance?.get(),options:preferenceOptions};}
export function applyEditorPreferences(changes){
 let persisted=true;
 if(changes.appearance){const before=appearance.get();persisted=appearance.save({...before,...changes.appearance,colors:{...before.colors,...changes.appearance.colors}});}
 if(changes.language!==undefined)setLanguage(changes.language);
 return {persisted};
}
