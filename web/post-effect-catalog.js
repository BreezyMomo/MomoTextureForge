import {POST_EFFECTS,EFFECT_BY_ID,effectValues} from './post-effect-specs.js';
import {uiText,uiFormat} from './ui-language.js';
import {messageText} from './message-catalog.js';
import {SUPPORTED_LANGUAGES,interfaceLanguage} from './language.js';
export const EFFECT_CATEGORIES=['optics','warp','color','material','style','mask'];
const groups={optics:['blur','bloom','chromatic','vignette','zoomBlur'],warp:['kaleidoscope','mirror','swirl','noiseWarp','shockwave'],color:['posterize','tricolor','dither'],material:['sharpen','edge','normal','bevel','liquidFusion'],style:['pixelate','scanline','sketch','halftone','glitch','kuwahara','xdog','crt','ascii','pixelSort'],mask:['radialMask','unblack','dissolve']};
export const effectCategory=id=>EFFECT_CATEGORIES.find(key=>groups[key].includes(id));
export function matchingEffects(query='',category='all'){
 const words=query.normalize('NFKC').toLocaleLowerCase().trim().slice(0,200).split(/\s+/).filter(Boolean);
 return POST_EFFECTS.filter(spec=>(category==='all'||effectCategory(spec.id)===category)&&words.every(word=>{
  const text=[spec.id,...SUPPORTED_LANGUAGES.flatMap(({code})=>[messageText(spec.label,code),messageText('fx.summary.'+spec.id,code),messageText('fx.search.'+spec.id,code)])].join(' ').normalize('NFKC').toLocaleLowerCase();return text.includes(word);
 }));
}
const summaryKeys={blur:['radius'],bloom:['strength','radius'],chromatic:['direction','distance'],scanline:['density','speed'],sketch:['fillStyle','roughness'],noiseWarp:['warpMode','warpX'],dissolve:['progress','dissolvePattern'],shockwave:['progress','displacement'],liquidFusion:['fusionRadius','fusionThreshold']};
const numberFormats=new Map();
export function compactEffectSummary(nodes,id){
 const spec=EFFECT_BY_ID.get(id),values=nodes.map(n=>effectValues(n,id)),keys=summaryKeys[id]??spec.parameters.filter(p=>p.type!=='color'&&p.key!=='mix').slice(0,2).map(p=>p.key);
 const language=interfaceLanguage();if(!numberFormats.has(language))numberFormats.set(language,new Intl.NumberFormat(language,{maximumFractionDigits:2}));const format=numberFormats.get(language);
 return keys.map(key=>{
  const p=spec.parameters.find(p=>p.key===key),v=values[0]?.[key];
  const text=values.some(value=>value[key]!==v)?uiText('fx.mixedValue'):p.options?uiText('fx.option.'+p.options[v]):p.type==='boolean'?uiText(v?'fx.active':'fx.bypassed'):format.format(v);
  return uiFormat('fx.compactParameter',uiText(p.label),text);
 }).join(' · ');
}
