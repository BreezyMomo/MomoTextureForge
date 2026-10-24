import {gifSettings} from './gif-settings.js';
import {normalizeDashPattern} from './sketch-options.js';
import {sanitizeBezierTail,BEZIER_LIMIT} from './bezier-path.js';
import {graphicAliasesField} from './graphic-name.js';
import {curveDefaults,sanitizeCurves} from './channel-curves.js';
import {sanitizeChannelSources} from './output-channels.js';
import {messageError} from './message-catalog.js';
import {parameterRole} from './parameter-metadata.js';
import {FX_SPECS,fxDefaults} from './post-fx.js';
import {POST_EFFECTS,EFFECT_PARAMETERS,effectDefaults,effectOrder,sanitizeEffects,sanitizeEffectPresence} from './post-effect-specs.js';
import {interpolateKeys,timeKey} from './animation-values.js';
import { BY_ID } from './catalog.js';
import { generateArrangement } from './arrangement-layouts.js';
import {fitInstances} from './instance-geometry.js';
import {EXTRA_SPECS,EXTRA_ENUMS,EXTRA_BOOLS,extraDefaults,sanitizeExtra,sanitizeTreeArrangement,advancedRecords,modifyRecords} from './tree-arrangement.js';
export const TREE_SCHEMA='momo.texture-tree/v1', PRESET_SCHEMA='momo.texture-subtree/v1';
export const POST_SPECS=[["ui.brightness",-.6,.6,0],["library.imageContrast",.1,3,1],["ui.gamma",.1,4,1],["ui.inputLow",-.5,.95,0],["ui.inputHigh",.05,1.5,1],["ui.outputLow",0,.9,0],["ui.outputHigh",.1,1.6,1]];
export const LIMITS={nodes:256,depth:12,tracks:64,frames:128};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,d,a=-10000,b=10000)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
export const uid=()=>globalThis.crypto?.randomUUID?.()??`n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export function shapeDefaults(type){const p=BY_ID.get(type)??BY_ID.get('Circle'),values=[...p.defaults];for(const spec of p.parameters)if(parameterRole(spec)==='feather')values[spec.slot]=0;return values;}
export function node(kind='shape',type='Circle'){
 const padding=kind==='shape'?(BY_ID.get(type)?.definition.renderPadding??0):0,size=padding?1/(1+2*padding+.08):1;
 return {id:uid(),name:kind==='group'?'组合':BY_ID.get(type)?.zh??type,kind,enabled:true,type,params:shapeDefaults(type),
 transform:{x:.5,y:.5,width:size,height:size,rotation:0,mirrorX:false,pivotX:.5,pivotY:.5,fit:'stretch',lockAspect:false},boundary:padding?'visible':'clip',opacity:1,blend:'over',seamMode:0,seamBlend:.2,
 uv:[1,0,0,0,0,0,0],polar:false,bezier:{shape:[],layout:[]},
 color:{mode:kind==='group'?'preserve':'inherit',fill:'gradient',low:'#000000',high:'#ffffff'},
 arrange:sanitizeTreeArrangement([0,...Array(58).fill(undefined)]),arrangeExtra:extraDefaults(),tileEdges:0,arrangeFit:'contain',imageFit:'contain',instancePhase:0,instanceContent:'all',scatterAvoidOverlap:false,scatterGap:0,
 timing:{start:0,end:1,from:0,to:1,cycles:1,loop:false,pingpong:false,ease:'linear',outside:'hold',frozen:false,at:0,offset:0,curve:[]},
 shapeClock:{follow:true,speed:1,offset:0,value:0},contour:{mode:'none',radius:.01},animationEnabled:true,post:POST_SPECS.map(p=>p[3]),postFx:fxDefaults(),postEffects:effectDefaults(),effectOrder:effectOrder(),effectPresence:{},curves:curveDefaults(),invert:false,maskInvert:false,tracks:{},children:[],mask:null};
}
export function project(){const root=node('group');root.name='画布';root.children=[node()];return {schema:TREE_SCHEMA,name:'未命名画布',root,projectResources:[],canvas:{ratio:1},output:{width:512,height:512,mode:'color',alpha:true,depth:8,seconds:3,exportSeconds:3,fps:30,frames:90,columns:8,loopExport:true,gif:gifSettings(),exrZip:true,background:'#000000',normal:3,normalAlgorithm:'sobel',normalFlipX:false,normalFlipY:false,normalInvert:false,normalSmooth:0,channels:[0,2,3,8],channelSources:[null,null,null,null]}};}
export function walk(root,fn,parent=null,depth=0){fn(root,parent,depth);for(const c of root.children)walk(c,fn,root,depth+1);if(root.mask)walk(root.mask,fn,root,depth+1);}
export function find(root,id){let found=null;walk(root,(n,p,d)=>{if(n.id===id)found={node:n,parent:p,depth:d};});return found;}
export function cloneNode(n){const c=structuredClone(n);walk(c,x=>x.id=uid());return c;}
export function pathGet(n,path){return path.split('.').reduce((x,k)=>x?.[k],n);}
export function pathSet(n,path,value){const parts=path.split('.');let at=n;for(const k of parts.slice(0,-1))at=at[k];at[parts.at(-1)]=value;}
export const ANIMATION_ENUMS={boundary:['clip','visible','repeat'],'contour.mode':['none','outline','dilate','erode'],blend:['over','add','max','multiply','subtract','screen','difference','overlay','softlight','dodge','mask','inverseMask'],'transform.fit':['stretch','contain'],'color.mode':['inherit','own','preserve','remap'],'color.fill':['solid','gradient']};
Object.assign(ANIMATION_ENUMS,Object.fromEntries(Object.entries(EXTRA_ENUMS).map(([key,values])=>['arrangeExtra.'+key,values])));
export const ANIMATION_BOOLS=['shapeClock.follow','enabled','transform.mirrorX','polar','invert',...EXTRA_BOOLS.map(key=>'arrangeExtra.'+key)];
ANIMATION_BOOLS.push(...POST_EFFECTS.flatMap(s=>['postEffects.'+s.id+'.enabled',...s.parameters.filter(p=>p.type==='boolean').map(p=>p.path)]));
export function animationType(n,path){
 if(EFFECT_PARAMETERS.get(path)?.type==='color')return 'color';
 if(['boolean','dash'].includes(EFFECT_PARAMETERS.get(path)?.type)||EFFECT_PARAMETERS.get(path)?.options)return 'discrete';
 const parameter=/^params\.(\d+)$/.exec(path);if(parameter&&BY_ID.get(n.type)?.parameters.find(p=>p.slot===+parameter[1])?.type==='select')return 'discrete';
 const generatorParameter=/^params\.(\d+)$/.exec(path);if(generatorParameter&&BY_ID.get(n.type)?.definition.generator){const spec=BY_ID.get(n.type).parameters.find(p=>p.slot===+generatorParameter[1]);if(spec?.step===1||spec?.type)return 'discrete';}
 if(path==='color.low'||path==='color.high')return 'color';
 if(ANIMATION_ENUMS[path]||ANIMATION_BOOLS.includes(path))return 'discrete';
 if(path==='tileEdges'||path==='arrangeExtra.flowFrequency')return 'discrete';
 if(path==='params.0'&&parameterRole(BY_ID.get(n.type)?.parameters.find(p=>p.slot===0)??{})==='image-mode')return 'discrete';
 if(n.type==='Gear'&&path==='params.8'||n.type==='Halftone'&&path==='params.4'||n.type==='RingPulse'&&path==='params.4'||n.type==='ConeGradient'&&path==='params.4'||n.type==='LineSegment'&&path==='params.5')return 'discrete';
 if(/^arrange\.(0|7|19|30|37|38|39|58)$/.test(path)||n.type==='Star'&&path==='params.5'||n.type==='BezierRibbon'&&path==='params.12')return 'discrete';
 return 'number';
}
export function fieldSpec(n,path){
 const effect=EFFECT_PARAMETERS.get(path);if(effect)return effect.type?[0,1]:[effect.min,effect.max];
 const bezier=/^bezier\.(shape|layout)\.(\d+)$/.exec(path);if(bezier)return +bezier[2]<(n.bezier?.[bezier[1]]?.length??0)?[-BEZIER_LIMIT,BEZIER_LIMIT]:null;
 if(ANIMATION_BOOLS.includes(path)||ANIMATION_ENUMS[path]||path==='color.low'||path==='color.high')return [0,1];
 if(path==='tileEdges')return [0,15];
 if(path.startsWith('arrangeExtra.')){const spec=EXTRA_SPECS[path.slice(13)];return spec?spec.slice(1,3):null;}
 if(path==='arrange.0')return [0,16];
 const fixed={'shapeClock.speed':[-10,10],'shapeClock.offset':[-600,600],'shapeClock.value':[-36000,36000],'contour.radius':[0,.1],opacity:[0,1],instancePhase:[-1,1],'transform.x':[-2,2],'transform.y':[-2,2],'transform.width':[0,1],'transform.height':[0,1],'transform.rotation':[-3600,3600],'transform.pivotX':[0,1],'transform.pivotY':[0,1]};
 const fx=/^postFx\.([0-6])$/.exec(path);if(fx)return FX_SPECS[+fx[1]].slice(1,3);
 const post=/^post\.([0-6])$/.exec(path);if(post)return POST_SPECS[+post[1]].slice(1,3);
 if(fixed[path])return fixed[path];
 const uv=/^uv\.([0-6])$/.exec(path);if(uv)return [[.1,8],[-360,360],[-2,2],[-2,2],[-2,2],[-360,360],[-6.28,6.28]][+uv[1]];
 const m=/^params\.(\d+)$/.exec(path);if(m){const p=BY_ID.get(n.type)?.parameters.find(p=>p.slot===+m[1]);return p?[parameterRole(p)==='feather'?0:p.min,p.max]:null;}
 const a=/^arrange\.(\d+)$/.exec(path);if(a&&+a[1]>=0&&+a[1]<59&&+a[1]!==39)return [-10000,10000];
 return null;
}
export function canvasRoot(root){
 const neutral=node('group');
 // A shape used directly by legacy callers is content, not an editor container.
 if(root.kind!=='group')return {...root,transform:neutral.transform};
 const result={...neutral,id:root.id,name:root.name,children:root.children};
 if(typeof root.resourceRef==='string')result.resourceRef=root.resourceRef;
 if(Number.isFinite(root.previewProgress))result.timing={...neutral.timing,frozen:true,at:root.previewProgress};
 return result;
}
export function sanitizeTree(raw,{component=false}={}){
 if(raw?.schema!==TREE_SCHEMA)throw messageError("ui.aNodeTreeProjectIsRequired");
 const seen=new Set();let count=0;
 function read(r,depth){
  if(!r||depth>LIMITS.depth||++count>LIMITS.nodes)throw messageError("ui.nodeTreeExceedsTheDepthOrNodeCountLimit");
  if(!['shape','group'].includes(r.kind)||typeof r.id!=='string'||!r.id||seen.has(r.id))throw messageError("ui.invalidOrDuplicateNodeTypeID");seen.add(r.id);
  if(r.kind==='shape'&&!BY_ID.has(r.type))throw messageError("errors.unknownGraphic", r.type);
  const n=node(r.kind,r.type);n.id=r.id;n.name=String(r.name??n.name).slice(0,80);n.enabled=r.enabled!==false;if(typeof r.resourceRef==='string')n.resourceRef=r.resourceRef.slice(0,96);
  for(const key of ['x','y','width','height','rotation','pivotX','pivotY']){const [min,max]=fieldSpec(n,'transform.'+key);n.transform[key]=num(r.transform?.[key],n.transform[key],min,max);}
  n.transform.lockAspect=!!r.transform?.lockAspect;n.transform.mirrorX=!!r.transform?.mirrorX;n.transform.fit=r.transform?.fit==='contain'?'contain':'stretch';n.opacity=num(r.opacity,1,0,1);n.blend=['over','add','max','multiply','subtract','screen','difference','overlay','softlight','dodge','mask','inverseMask'].includes(r.blend)?r.blend:'over';n.seamMode=r.seamMode===1?1:0;n.seamBlend=num(r.seamBlend,.2,.05,.45);
  n.boundary=ANIMATION_ENUMS.boundary.includes(r.boundary)?r.boundary:r.seamless?'repeat':r.overflow==='visible'?'visible':n.boundary;
  n.color.mode=['inherit','own','preserve','remap'].includes(r.color?.mode)?r.color.mode:n.color.mode;
  n.color.fill=r.color?.fill==='solid'?'solid':'gradient';
  for(const key of ['low','high'])n.color[key]=/^#[0-9a-f]{6}$/i.test(r.color?.[key])?r.color[key]:n.color[key];
  n.shapeClock={follow:r.shapeClock?.follow!==false,speed:num(r.shapeClock?.speed,1,-10,10),offset:num(r.shapeClock?.offset,0,-600,600),value:num(r.shapeClock?.value,0,-36000,36000)};
  n.contour={mode:ANIMATION_ENUMS['contour.mode'].includes(r.contour?.mode)?r.contour.mode:'none',radius:num(r.contour?.radius,.01,0,.1)};
  n.postFx=FX_SPECS.map((p,i)=>num(r.postFx?.[i],p[3],p[1],p[2]));n.postFx[6]=Math.round(n.postFx[6]);
  n.postEffects=sanitizeEffects(r.postEffects);n.effectOrder=effectOrder(r.effectOrder);n.effectPresence=sanitizeEffectPresence(r.effectPresence);
  n.curves=sanitizeCurves(r.curves);
  n.animationEnabled=r.animationEnabled!==false;n.post=POST_SPECS.map((p,i)=>num(r.post?.[i],p[3],p[1],p[2]));n.invert=!!r.invert;n.maskInvert=!!r.maskInvert;
  if(Array.isArray(r.color?.stops))n.color.stops=r.color.stops.slice(0,8).filter(s=>/^#[0-9a-f]{6}$/i.test(s.color)).map(s=>({color:s.color,position:num(s.position,0,0,1)})).sort((a,b)=>a.position-b.position);
  n.uv=n.uv.map((v,i)=>num(r.uv?.[i],v,...fieldSpec(n,'uv.'+i)));n.polar=!!r.polar;
  n.params=n.params.map((v,i)=>{const p=BY_ID.get(n.type)?.parameters.find(p=>p.slot===i);return p?num(r.params?.[i],v,parameterRole(p)==='feather'?0:p.min,p.max):v;});
  n.bezier={shape:sanitizeBezierTail(r.bezier?.shape),layout:sanitizeBezierTail(r.bezier?.layout)};
  n.arrange=sanitizeTreeArrangement(Array.from({length:59},(_,i)=>r.arrange?.[i]));n.arrangeExtra=sanitizeExtra(r.arrangeExtra);n.tileEdges=Math.round(num(r.tileEdges,0,0,15));n.arrangeFit=r.arrangeFit==='stretch'?'stretch':'contain';n.imageFit=r.imageFit==='stretch'?'stretch':'contain';n.instancePhase=num(r.instancePhase,0,-1,1);n.instanceContent=n.kind==='group'&&['random-child','cycle-child'].includes(r.instanceContent)?r.instanceContent:'all';n.scatterAvoidOverlap=r.scatterAvoidOverlap===true;n.scatterGap=num(r.scatterGap,0,0,.5);
  for(const key of ['start','end','from','to','at'])n.timing[key]=num(r.timing?.[key],n.timing[key],0,1);
  if(n.timing.end<n.timing.start)throw messageError("ui.theIntervalEndMustNotPrecedeItsStart");
  n.timing.curve=Array.isArray(r.timing?.curve)?r.timing.curve.filter(k=>Array.isArray(k)&&k.length===2&&k.every(Number.isFinite)).slice(0,128).map(k=>k.map(v=>clamp(v,0,1))).sort((a,b)=>a[0]-b[0]):[];
  n.timing.offset=num(r.timing?.offset,0,-1,1);n.timing.cycles=num(r.timing?.cycles,1,.01,64);for(const key of ['loop','pingpong','frozen'])n.timing[key]=!!r.timing?.[key];
  n.timing.ease=['linear','smooth','hold'].includes(r.timing?.ease)?r.timing.ease:'linear';n.timing.outside=r.timing?.outside==='hide'?'hide':'hold';
  for(const key of ['before','after'])if(r.timing?.[key]!==undefined)n.timing[key]=r.timing[key]==='hide'?'hide':'hold';
  // Reserve the newly split outline track so a full legacy node loses no tracks.
  const outlinePath='postEffects.sketch.strokeRoughness',fillPath='postEffects.sketch.roughness',rawTracks=r.tracks??{},outlineTrack=rawTracks[outlinePath]??(r.postEffects?.sketch?.strokeRoughness===undefined?rawTracks[fillPath]:null);
  const trackEntries=Object.entries(rawTracks).filter(([path])=>path!==outlinePath).slice(0,LIMITS.tracks);if(outlineTrack)trackEntries.push([outlinePath,outlineTrack]);
  for(const [path,track] of trackEntries){
   const spec=fieldSpec(n,path);if(!spec||!track)continue;
   const type=animationType(n,path),mode=type==='number'&&['absolute','add','multiply'].includes(track.mode)?track.mode:'absolute';
   const bounds=mode==='absolute'?spec:mode==='multiply'?[-10,10]:[-10000,10000];
   const frames=new Map();for(const f of Array.isArray(track.keys)?track.keys.slice(0,LIMITS.frames):[]){
    if(!Array.isArray(f)||f.length!==2||!Number.isFinite(f[0]))continue;let v=f[1];
    if(type==='color'){if(!/^#[0-9a-f]{6}$/i.test(v))continue;}
    else if(EFFECT_PARAMETERS.get(path)?.type==='dash'){v=normalizeDashPattern(v);if(v===null)continue;}
    else if(ANIMATION_ENUMS[path]){if(!ANIMATION_ENUMS[path].includes(v))continue;}
    else if(ANIMATION_BOOLS.includes(path)){if(typeof v!=='boolean')continue;}
    else{if(!Number.isFinite(v))continue;v=clamp(v,...bounds);}
    frames.set(clamp(f[0],0,1),v);
   }
   const clean={mode,ease:type==='discrete'?'hold':track.ease==='hold'?'hold':track.ease==='smooth'?'smooth':'linear',keys:[...frames].sort((a,b)=>a[0]-b[0])};
   if(type!=='number')clean.type=type;
   if(track.muted===true)clean.muted=true;
   if(type==='number'&&track.segments){const segments={};for(const [t]of clean.keys){const v=track.segments[timeKey(t)];if(!v)continue;segments[timeKey(t)]={ease:['linear','smooth','hold','cubic'].includes(v.ease)?v.ease:'linear'};for(const k of ['in','out'])if(Number.isFinite(v[k]))segments[timeKey(t)][k]=clamp(v[k],-1e6,1e6);}if(Object.keys(segments).length)clean.segments=segments;}
   n.tracks[path]=clean;
  }
  if(r.children&&!Array.isArray(r.children))throw messageError("ui.invalidChildNodeList");
  if(n.kind==='shape'&&r.children?.length)throw messageError("ui.shapeNodesCannotContainOrdinaryChildrenCreateAGroup");
  n.children=(r.children??[]).map(c=>read(c,depth+1));if(r.mask)n.mask=read(r.mask,depth+1);return n;
 }
 const p=project();p.root=read(raw.root,0);
 if(raw.projectResources!==undefined){if(!Array.isArray(raw.projectResources))throw messageError("ui.invalidGraphicsListFormat");const ids=new Set();p.projectResources=raw.projectResources.map(entry=>{if(!entry||typeof entry.id!=='string'||ids.has(entry.id))throw messageError("ui.invalidOrDuplicateGraphicsListID");ids.add(entry.id);const clean=sanitizeTree({...project(),root:entry.root,projectResources:[]},{component:true}).root;return {id:entry.id,...(typeof entry.builtin==='string'&&BY_ID.has(entry.builtin)&&!entry.builtin.startsWith('asset_')?{builtin:entry.builtin}:{}),name:String(entry.name??clean.name).slice(0,80),...graphicAliasesField(entry.aliases),category:String(entry.category??'图形列表').slice(0,80),description:String(entry.description??'').slice(0,2000),kind:['formula','image','composition'].includes(entry.kind)?entry.kind:'composition',resourceId:typeof entry.resourceId==='string'?entry.resourceId:uid(),versionId:Math.max(1,Math.floor(num(entry.versionId,1,1,1000000000))),personalRevision:Math.floor(num(entry.personalRevision,0,0,1000000000)),source:entry.source?{resourceId:String(entry.source.resourceId).slice(0,128),versionId:Math.max(1,Math.floor(num(entry.source.versionId,1,1,1000000000)))}:null,root:clean};});}
if(!component)p.root=canvasRoot(p.root);p.name=String(raw.name??p.name).slice(0,80);
 for(const [key,min,max] of [['width',1,4096],['height',1,4096],['columns',1,32],['depth',8,16],['seconds',.05,600],['normal',0,20]])p.output[key]=num(raw.output?.[key],p.output[key],min,max);
 for(const key of ['width','height','columns'])p.output[key]=Math.round(p.output[key]);p.output.depth=p.output.depth===16?16:8;
 p.output.normalAlgorithm=raw.output?.normalAlgorithm==='scharr'?'scharr':'sobel';for(const k of ['normalFlipX','normalFlipY','normalInvert'])p.output[k]=raw.output?.[k]===true;p.output.normalSmooth=num(raw.output?.normalSmooth,0,0,8);
 p.output.channels=Array.from({length:4},(_,i)=>Math.round(num(raw.output?.channels?.[i],p.output.channels[i],0,13)));
 p.output.channelSources=sanitizeChannelSources(raw.output?.channelSources);
 if(/^#[0-9a-f]{6}$/i.test(raw.output?.background))p.output.background=raw.output.background;
 p.canvas.ratio=num(raw.canvas?.ratio,p.output.width/p.output.height,1/8,8);
 p.output.mode=['color','height','normal','rgba'].includes(raw.output?.mode)?raw.output.mode:'color';p.output.alpha=raw.output?.alpha!==false;p.output.exrZip=raw.output?.exrZip!==false;p.output.loopExport=raw.output?.loopExport!==false;
 p.output.gif=gifSettings(raw.output?.gif);
 // Missing export duration migrates to the original one-cycle duration.
 p.output.exportSeconds=num(raw.output?.exportSeconds,p.output.seconds,.05,600);
 const legacy=Number(raw.output?.frames);const fallback=Number.isFinite(legacy)?Math.max(1,legacy-(p.output.loopExport?0:1))/p.output.exportSeconds:30;
 p.output.fps=num(raw.output?.fps,fallback,1,120);p.output.fps=clamp(p.output.fps,1,120);p.output.frames=exportFrameCount(p.output);return p;
}
export const shiftedProgress=(time,offset)=>Math.abs(offset%1)<1e-9?time:((time+offset)%1+1)%1;
export function localClock(timing,parentTime){
 const t=timing;parentTime=shiftedProgress(parentTime,t.offset);const span=t.end-t.start,visible=!(parentTime<t.start&&(t.before??t.outside)==='hide'||parentTime>t.end&&(t.after??t.outside)==='hide');
 let local=span<=1e-9?(parentTime>=t.start?1:0):clamp((parentTime-t.start)/span,0,1);
 if(t.frozen)return {local,progress:t.at,visible};
 let p=local*t.cycles;
 if(t.loop){if(t.pingpong){const q=p%2;p=q<=1?q:2-q;}else p=local===1&&p%1===0?1:p%1;}else p=clamp(p,0,1);
 if(t.curve?.length)p=keyValue({keys:t.curve,ease:t.ease},p);
 else if(t.ease==='smooth')p=p*p*(3-2*p);if(!t.curve?.length&&t.ease==='hold')p=p>=1?1:0;
 return {local,progress:t.from+(t.to-t.from)*p,visible};
}
export const keyValue=interpolateKeys;
export function evaluateNode(n,parentTime,progressOverride){const clock=localClock(n.timing,parentTime);if(progressOverride!==undefined)clock.progress=progressOverride;const out={...n,bezier:{shape:[...(n.bezier?.shape??[])],layout:[...(n.bezier?.layout??[])]},transform:{...n.transform},color:{...n.color},contour:{...n.contour},shapeClock:{follow:true,speed:1,offset:0,value:0,...n.shapeClock},post:[...n.post],postFx:[...(n.postFx??fxDefaults())],postEffects:sanitizeEffects(n.postEffects),effectOrder:effectOrder(n.effectOrder),effectPresence:sanitizeEffectPresence(n.effectPresence),arrangeExtra:{...extraDefaults(),...n.arrangeExtra},params:[...n.params],uv:[...n.uv],arrange:[...n.arrange]};for(const [path,track]of Object.entries(n.animationEnabled===false?{}:n.tracks)){const v=keyValue(track,clock.progress),bounds=fieldSpec(n,path);if(track.muted||v===null||!bounds)continue;if(animationType(n,path)!=='number'){pathSet(out,path,v);continue;}const base=pathGet(n,path);pathSet(out,path,clamp(track.mode==='add'?base+v:track.mode==='multiply'?base*v:v,...bounds));}out.arrange=sanitizeTreeArrangement(out.arrange);out.arrangeExtra=sanitizeExtra(out.arrangeExtra);return {node:out,...clock,visible:clock.visible&&out.enabled&&out.transform.width>0&&out.transform.height>0};}
export function nodeClock(root,id,time){let result=null;function visit(n,t){const e=evaluateNode(n,t);if(n.id===id)result=e;for(const c of n.children)visit(c,e.progress);if(n.mask)visit(n.mask,e.progress);}visit(root,time);return result;}
export function moveNode(root,id,parentId,index=Infinity){const source=find(root,id),target=find(root,parentId);if(!source?.parent||!target||target.node.kind!=='group')throw messageError("ui.selectMovableNodesAndATargetGroup");if(find(source.node,parentId))throw messageError("ui.cannotMoveANodeIntoItselfOrItsDescendants");if(source.parent.mask===source.node)source.parent.mask=null;else source.parent.children.splice(source.parent.children.indexOf(source.node),1);target.node.children.splice(Math.min(index,target.node.children.length),0,source.node);}
export function removeNode(root,id){const x=find(root,id);if(!x?.parent)throw messageError("ui.cannotDeleteTheCanvasRoot");if(x.parent.mask===x.node)x.parent.mask=null;else x.parent.children.splice(x.parent.children.indexOf(x.node),1);}
export const scatterOptions=(n,aspect=1)=>({avoidOverlap:n.scatterAvoidOverlap===true,gap:n.scatterGap??0,wrap:n.boundary==='repeat',aspect,fit:n.arrangeFit??'contain',bezier:n.bezier?.layout??[]});
export function placements(a,n={},_time=0,_original=n,aspect=1){const records=rawPlacements(a,n,aspect),fitted=a[0]&&!([15,16].includes(a[0]))?fitInstances(records,aspect,n.arrangeFit??'contain'):records;return modifyRecords(fitted,{...n,arrange:a},aspect);}
function rawPlacements(a,n={},aspect=1){
 if(a[0]>=13)return advancedRecords({...n,arrange:a},aspect);
 if(!a[0])return [{x:.5,y:.5,width:1,height:1,turn:0,mirror:1}];
 if([1,4].includes(a[0])){let seed=a[11]>>>0;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const points=[];for(let y=0;y<a[2];y++)for(let x=0;x<a[1];x++){
 const jx=(rng()*2-1)*a[8]/a[1],jy=(rng()*2-1)*a[8]/a[2],size=1+(rng()*2-1)*a[9],spin=a[6]*Math.PI/180,turn=spin+(rng()*2-1)*a[10]*Math.PI/180;
 const px=(x+.5+(y%2)*(a[0]===4?.5:a[12]))/a[1]-.5+jx,py=(y+.5)/a[2]-.5+jy,c=Math.cos(spin),sn=Math.sin(spin);
 points.push({x:.5+c*px-sn*py+a[13],y:.5+sn*px+c*py+a[14],width:Math.min(1,size/a[1]),height:Math.min(1,size/a[2]),turn,mirror:1});}return points;}
 if(a[0]===5){let seed=a[11]>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};return Array.from({length:a[3]},(_,i)=>{const f=i/Math.max(1,a[3]-1),angle=(i*a[16]+a[6])*Math.PI/180,r=a[5]*Math.sqrt(a[17]**2+(1-a[17]**2)*f),size=a[4]*(1+(a[18]-1)*f)*(1+(random()*2-1)*a[9]);return{x:.5+Math.cos(angle)*r+a[13]+(random()*2-1)*a[8]*a[5],y:.5+Math.sin(angle)*r+a[14]+(random()*2-1)*a[8]*a[5],width:Math.min(1,size),height:Math.min(1,size),turn:(random()*2-1)*a[10]*Math.PI/180+(a[19]?angle-Math.PI/2+(a[19]===2?Math.PI/2:0):a[6]*Math.PI/180),mirror:1};});}
 return generateArrangement(a,scatterOptions(n,aspect)).map(p=>({...p,width:Math.min(1,p.size),height:Math.min(1,p.size),turn:-p.turn}));
}
// Stable per-slot hash: choices survive cloning, serialization and animation sampling.
export function instanceChildren(n,index,record){
 if(n.arrange[0]===16)return record?.childIndex===undefined?[]:n.children[record.childIndex]?.enabled?[n.children[record.childIndex]]:[];
 const children=n.arrange[0]===14?n.children.slice(1):n.children;
 if(n.kind!=='group'||!['random-child','cycle-child'].includes(n.instanceContent))return children;
 const pool=children.filter(c=>c.enabled);if(!pool.length)return [];
 if(n.instanceContent==='cycle-child')return [pool[index%pool.length]];
 let h=((n.arrange[11]>>>0)^Math.imul(index+1,0x9e3779b9))>>>0;
 h=Math.imul(h^(h>>>16),0x21f0aaad);h=Math.imul(h^(h>>>15),0x735a2d97);h=(h^(h>>>15))>>>0;
 return [pool[Math.floor(h/4294967296*pool.length)]];
}
export function expandInstances(root,id,time,records){const entry=find(root,id);if(!entry)throw messageError("ui.nodeNotFound");const n=entry.node,e=nodeClock(root,id,time);if(!n.arrange[0])throw messageError("ui.nodeHasNoArrangement");
 const points=records??placements(e.node.arrange,e.node),content=cloneNode(n);content.transform=node().transform;content.boundary=n.boundary==='repeat'?'visible':n.boundary;if(content.tracks.boundary)content.tracks.boundary.keys=content.tracks.boundary.keys.map(([t,v])=>[t,v==='repeat'?'visible':v]);content.opacity=1;content.blend='over';content.arrange[0]=0;if(content.color.mode==='remap')content.color.mode='own';content.instancePhase=0;content.mask=null;content.post=POST_SPECS.map(p=>p[3]);content.postFx=fxDefaults();content.postEffects=effectDefaults();content.effectOrder=effectOrder();content.effectPresence={};content.contour=node().contour;content.invert=false;content.maskInvert=false;content.timing=node().timing;
 for(const path of Object.keys(content.tracks))if(path.startsWith('arrange.')||path.startsWith('arrangeExtra.')||path.startsWith('bezier.layout.')||path.startsWith('transform.')||path==='opacity'||(path.startsWith('post.')||path.startsWith('postFx.')||path.startsWith('postEffects.'))||path.startsWith('contour.'))delete content.tracks[path];
 const result=node('group');Object.assign(result,{id:n.id,name:n.name,transform:n.transform,boundary:n.boundary,opacity:n.opacity,blend:n.blend,seamMode:n.seamMode,seamBlend:n.seamBlend,timing:n.timing,animationEnabled:n.animationEnabled,mask:n.mask,maskInvert:n.maskInvert,post:n.post,postFx:n.postFx,postEffects:n.postEffects,effectOrder:n.effectOrder,effectPresence:n.effectPresence,contour:n.contour,invert:n.invert,color:n.color});result.tracks=Object.fromEntries(Object.entries(n.tracks).filter(([p])=>p.startsWith('transform.')||p==='boundary'||p==='opacity'||(p.startsWith('post.')||p.startsWith('postFx.')||p.startsWith('postEffects.'))||p.startsWith('contour.')));
 if(e.node.arrange[0]===14&&e.node.arrangeExtra.showSource)result.children=[cloneNode(n.children[0])];
 let size=0;walk(root,()=>size++);walk(n,()=>size--);walk(result,()=>size++);
 for(let i=0;i<points.length;i++){size++;for(const c of instanceChildren(e.node,i,points[i]))walk(c,()=>size++);if(size>LIMITS.nodes)throw messageError("ui.expandingWouldExceedTheNodeLimit");}
 result.children.push(...points.map((p,i)=>{const c=cloneNode({...content,children:instanceChildren(e.node,i,p)});c.instanceContent='all';c.arrangeExtra=extraDefaults();c.opacity=p.opacity??1;c.name=`${n.name} ${i+1}`;c.transform={...c.transform,x:p.x,y:p.y,width:p.width,height:p.height,rotation:p.turn*180/Math.PI};c.transform.mirrorX=p.mirror<0;c.timing.offset=i*e.node.instancePhase%1;return c;}));
 walk(result,(_n,_p,d)=>{if(d+entry.depth>LIMITS.depth)throw messageError("ui.expandingWouldExceedTheDepthLimit");});
 if(!entry.parent)return result;if(entry.parent.mask===n)entry.parent.mask=result;else entry.parent.children[entry.parent.children.indexOf(n)]=result;return root;
}

export function exportDuration(o){return Number.isFinite(o.exportSeconds)&&o.exportSeconds>0?o.exportSeconds:o.seconds;}
export function exportFrameCount(o){return Math.max(1,Math.ceil(exportDuration(o)*o.fps-1e-9))+(o.loopExport===false?1:0);}
export function exportFrameSeconds(o,i){return Math.min(exportDuration(o),Math.max(0,i)/o.fps);}
export function exportFrameProgress(o,i){
 const phase=exportFrameSeconds(o,i)/o.seconds,nearest=Math.round(phase);
 // Only the optional final sample retains progress 1; interior cycle boundaries restart at 0.
 if(Math.abs(phase-nearest)<1e-9)return o.loopExport===false&&i===exportFrameCount(o)-1&&nearest>0?1:0;
 return phase-Math.floor(phase);
}
