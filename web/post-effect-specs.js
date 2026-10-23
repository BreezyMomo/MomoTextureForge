import {CONTENT_EFFECTS} from './content-effects.js';
import {CREATIVE_EFFECTS} from './creative-effect-specs.js';
import {NOISE_WARP_SPEC,noiseWarpActive} from './noise-warp.js';
import {normalizeDashPattern} from './sketch-options.js';
// Stable IDs and paths are part of saved nodes; array indices remain for legacy animations.
export const FX_SPECS=[
 ['ui.blurRadius',0,32,0,.1],['ui.bloomIntensity',0,3,0,.01],
 ['ui.bloomRadius',1,64,16,1],['ui.bloomThreshold',0,1,.6,.01],
 ['ui.sharpenIntensity',0,3,0,.01],['ui.chromaticAberrationDistance',0,24,0,.1],['ui.posterizeLevels',0,16,0,1]
];
export const fxDefaults=()=>FX_SPECS.map(s=>s[3]);
const number=(key,min,max,value,step=.01)=>({key,label:'fx.param.'+key,min,max,default:value,step});
const toggle=(key,value=false)=>({key,label:'fx.param.'+key,type:'boolean',default:value});
const color=(key,value)=>({key,label:'fx.param.'+key,type:'color',default:value});
const legacy=(index,key)=>{const [,min,max,value,step]=FX_SPECS[index];return {...number(key,min,max,value,step),path:'postFx.'+index};};
export const POST_EFFECTS=[
 {id:'blur',legacy:0,start:4,parameters:[legacy(0,'radius')]},
 {id:'bloom',legacy:1,start:.6,parameters:[legacy(1,'strength'),legacy(2,'radius'),legacy(3,'threshold')]},
 {id:'sharpen',legacy:4,start:1,parameters:[legacy(4,'strength')]},
 {id:'chromatic',legacy:5,start:2,parameters:[legacy(5,'distance'),{...number('direction',0,2,0,1),options:['horizontal','vertical','radial']}]},
 {id:'posterize',legacy:6,start:4,parameters:[legacy(6,'darkSteps'),number('lightSteps',0,16,0,1)]},
 {id:'pixelate',parameters:[number('size',1,200,8,1)]},
 {id:'vignette',parameters:[number('strength',0,2,.6),number('range',0,2,1),toggle('top',true),toggle('bottom',true),toggle('left',true),toggle('right',true),color('color','#000000')]},
 {id:'scanline',parameters:[number('density',1,500,120,1),number('speed',-10,10,1,.1),number('strength',0,1,.25),number('phase',0,1,0),color('color','#000000')]},
 {id:'kaleidoscope',parameters:[number('segments',2,24,6,1),number('rotation',-360,360,0,1)]},
 {id:'mirror',parameters:[toggle('mirrorX',true),toggle('mirrorY')]},
 {id:'swirl',parameters:[number('strength',-10,10,3,.1),number('radius',.01,2,.7)]},
 {id:'edge',parameters:[number('width',.1,5,1,.1),number('strength',0,3,1),color('color','#ffffff')]},
 {id:'tricolor',parameters:[color('shadow','#000000'),color('midtone','#808080'),color('highlight','#ffffff')]},
 {id:'radialMask',parameters:[number('centerX',0,1,.5),number('centerY',0,1,.5),number('radius',.01,2,.5),number('feather',0,1,.2),toggle('invert')]},
 {id:'unblack',parameters:[number('strength',0,1,1)]},
 {id:'normal',parameters:[number('strength',0,20,3,.1),number('sampleStep',1,8,1,1),toggle('flipY')]},
 {id:'sketch',parameters:[
  number('roughness',0,10,1.3,.1),number('bowing',0,20,1,.1),number('strokeWidth',0,12,1.8,.1),toggle('doubleStroke',true),color('strokeColor','#202020'),
  {...number('fillStyle',0,9,2,1),options:['originalFill','solidFill','hachure','crossHatch','noFill','zigzag','dots','dashed','zigzagLine','sunburst']},color('fillColor','#e9b35f'),number('hatchAngle',-180,180,-41,1),number('hatchGap',1,100,8,.5),number('hatchWidth',.1,40,.8,.1),
  {...number('source',0,1,0,1),options:['alphaContour','luminanceContour']},{...number('threshold',.01,.99,.5),label:'fx.param.contourThreshold'},number('simplify',.2,8,2,.1),number('seed',1,2147483646,1,1),
  number('strokeOpacity',0,1,1,.01),number('fillOpacity',0,1,1,.01),number('maxRandomnessOffset',0,20,2,.1),toggle('preserveVertices'),
  {...number('fillMultiStroke',0,2,0,1),options:['followStroke','singleStroke','doubleStroke']},number('fillShapeRoughnessGain',0,10,.8,.1),
  {key:'strokeDashPattern',label:'fx.param.strokeDashPattern',type:'dash',default:''},number('strokeDashOffset',-512,512,0,.5),
  {key:'fillDashPattern',label:'fx.param.fillDashPattern',type:'dash',default:''},number('fillDashOffset',-512,512,0,.5),
  number('dashLength',.1,200,8,.5),number('dashGap',.1,200,8,.5),number('zigzagOffset',.1,100,8,.5),
  number('curveStepCount',4,48,9,1),number('curveFitting',.1,1,.95,.01),number('curveTightness',0,1,0,.01),
  number('pathSimplification',0,1,0,.01),number('fixedDecimalPlaceDigits',-1,6,-1,1),
  number('sunburstCenterX',0,1,.5),number('sunburstCenterY',0,1,.5),number('sunburstRays',4,720,72,1)
 ]}
,...CREATIVE_EFFECTS,NOISE_WARP_SPEC,...CONTENT_EFFECTS
].map(spec=>({...spec,label:'fx.effect.'+spec.id,description:'fx.help.'+spec.id,parameters:spec.parameters.map(p=>({...p,path:p.path??'postEffects.'+spec.id+'.'+p.key}))}));
export const EFFECT_IDS=POST_EFFECTS.map(s=>s.id);
export const EFFECT_BY_ID=new Map(POST_EFFECTS.map(s=>[s.id,s]));
export const EFFECT_PARAMETERS=new Map(POST_EFFECTS.flatMap(s=>s.parameters.map(p=>[p.path,p])));
export function effectDefaults(){return Object.fromEntries(POST_EFFECTS.map(s=>[s.id,{enabled:s.legacy===undefined?false:null,...Object.fromEntries(s.parameters.filter(p=>!p.path.startsWith('postFx.')).map(p=>[p.key,p.default]))}]));}
export function effectOrder(order){return [...new Set([...(Array.isArray(order)?order:[]).filter(id=>EFFECT_BY_ID.has(id)),...EFFECT_IDS])];}
export function effectEnabled(n,id){const spec=EFFECT_BY_ID.get(id);if(!spec||n.effectPresence?.[id]===false)return false;const enabled=n.postEffects?.[id]?.enabled;return typeof enabled==='boolean'?enabled:spec.legacy!==undefined&&(n.postFx?.[spec.legacy]??0)>0;}
// Presence is structural. Removing an effect never rewrites its parameter/enable tracks.
// Missing entries retain legacy/programmatic behavior and migrate from authored values.
export const sanitizeEffectPresence=raw=>Object.fromEntries(EFFECT_IDS.filter(id=>typeof raw?.[id]==='boolean').map(id=>[id,raw[id]]));
export function effectPresent(n,id){
 if(typeof n.effectPresence?.[id]==='boolean')return n.effectPresence[id];
 const spec=EFFECT_BY_ID.get(id);if(!spec)return false;
 return effectEnabled(n,id)||spec.parameters.some(p=>{const value=p.path.startsWith('postFx.')?n.postFx?.[+p.path.split('.')[1]]:n.postEffects?.[id]?.[p.key];return value!==undefined&&value!==p.default;})||Object.keys(n.tracks??{}).some(path=>path.startsWith('postEffects.'+id+'.')||spec.parameters.some(p=>p.path===path));
}
export const effectStack=n=>effectOrder(n.effectOrder).filter(id=>effectPresent(n,id));
export const reorderEffects=(n,visible)=>effectOrder([...visible,...effectOrder(n.effectOrder).filter(id=>!visible.includes(id))]);
export function effectAddValues(n,id){
 if(effectPresent(n,id))return {};
 const stack=[...effectStack(n),id],restoring=n.effectPresence?.[id]===false;
 return {...(restoring?{}:effectEnableValues(n,id,true)),['effectPresence.'+id]:true,effectOrder:reorderEffects(n,stack)};
}
export const effectRemoveValues=id=>({['effectPresence.'+id]:false});
export function sanitizeEffects(raw){const result=effectDefaults();for(const s of POST_EFFECTS){const value=raw?.[s.id];if(typeof value?.enabled==='boolean')result[s.id].enabled=value.enabled;for(const p of s.parameters){if(p.path.startsWith('postFx.'))continue;const v=value?.[p.key];result[s.id][p.key]=p.type==='dash'?normalizeDashPattern(v)??p.default:p.type==='boolean'?typeof v==='boolean'?v:p.default:p.type==='color'?/^#[0-9a-f]{6}$/i.test(v)?v:p.default:Number.isFinite(v)?Math.max(p.min,Math.min(p.max,p.step===1?Math.round(v):v)):p.default;}}return result;}
export function effectValues(n,id){const spec=EFFECT_BY_ID.get(id);return Object.fromEntries(spec.parameters.map(p=>[p.key,p.path.startsWith('postFx.')?n.postFx?.[+p.path.split('.')[1]]??p.default:n.postEffects?.[id]?.[p.key]??p.default]));}
export function effectEnableValues(n,id,enabled){const s=EFFECT_BY_ID.get(id),values={['effectPresence.'+id]:true,['postEffects.'+id+'.enabled']:enabled};if(enabled&&s.legacy!==undefined&&!(n.postFx?.[s.legacy]>0))values['postFx.'+s.legacy]=s.start;return values;}
export function effectResetValues(id){const s=EFFECT_BY_ID.get(id);return Object.fromEntries(s.parameters.map(p=>[p.path,p.path==='postFx.'+s.legacy?s.start:p.default]));}
export const effectResetAllValues=n=>Object.fromEntries(POST_EFFECTS.flatMap(s=>[...(effectPresent(n,s.id)?[['effectPresence.'+s.id,true]]:[]),['postEffects.'+s.id+'.enabled',false],...s.parameters.map(p=>[p.path,p.default])]));
export const effectsUseTime=n=>(effectEnabled(n,'scanline')&&effectValues(n,'scanline').speed!==0)||['glitch','crt'].some(id=>effectEnabled(n,id)&&effectValues(n,id).rate!==0)||(effectEnabled(n,'noiseWarp')&&noiseWarpActive(effectValues(n,'noiseWarp'))&&effectValues(n,'noiseWarp').motionSpeed>0);

// Style-specific controls are hidden without discarding their stored values.
export function effectParameterVisible(p,values){
 if(p.path==='postEffects.dissolve.dissolveAngle')return values.dissolvePattern===2;
 if(['postEffects.dissolve.edgeWidth','postEffects.dissolve.burnColor'].includes(p.path))return values.dissolveStyle===1;
 if(p.path==='postEffects.liquidFusion.liquidColor')return values.fusionColor===1;
 if(p.path==='postEffects.noiseWarp.loopSeconds')return values.warpMotion===1;
 if(p.path.startsWith('postEffects.halftone.')&&['inkColor','paperColor'].includes(p.key))return values.inkMode===0;
 if(p.path.startsWith('postEffects.dither.')){if(p.key==='levels')return values.paletteMode<2;if(['inkColor','paperColor'].includes(p.key))return values.paletteMode>=2;if(p.key==='seed')return values.ditherPattern===2;}
 if(p.path.startsWith('postEffects.kuwahara.')&&p.key==='anisotropy')return values.paintMode===1;
 if(p.path.startsWith('postEffects.ascii.')){if(p.key==='inkColor')return !values.colored;if(p.key==='paperColor')return values.paperOpacity>0;}
 if(!p.path.startsWith('postEffects.sketch.'))return true;const style=values.fillStyle;
 const only={fillOpacity:[1,2,3,5,6,7,8,9],fillColor:[1,2,3,5,6,7,8,9],hatchAngle:[2,3,5,7,8,9],hatchGap:[2,3,5,6,7,8],hatchWidth:[2,3,5,6,7,8,9],fillMultiStroke:[2,3,5,6,7,8,9],fillShapeRoughnessGain:[1],fillDashPattern:[2,3,5,6,7,8,9],fillDashOffset:[2,3,5,6,7,8,9],dashLength:[7],dashGap:[7],zigzagOffset:[8],curveStepCount:[6],curveFitting:[6],curveTightness:[6],sunburstCenterX:[9],sunburstCenterY:[9],sunburstRays:[9]};
 return !only[p.key]||only[p.key].includes(style);
}
