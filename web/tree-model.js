import {interpolateKeys,timeKey} from './animation-values.js';
import { BY_ID } from './catalog.js';
import { sanitizeArrangement } from './arrangement.js';
import { generateArrangement } from './arrangement-layouts.js';
import {fitInstances} from './instance-geometry.js';
export const TREE_SCHEMA='momo.texture-tree/v1', PRESET_SCHEMA='momo.texture-subtree/v1';
export const POST_SPECS=[['亮度',-.6,.6,0],['对比度',.1,3,1],['伽马',.1,4,1],['输入低',-.5,.95,0],['输入高',.05,1.5,1],['输出低',0,.9,0],['输出高',.1,1.6,1]];
export const LIMITS={nodes:256,depth:12,tracks:64,frames:128};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,d,a=-10000,b=10000)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
export const uid=()=>globalThis.crypto?.randomUUID?.()??`n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export function shapeDefaults(type){const p=BY_ID.get(type)??BY_ID.get('Circle'),values=[...p.defaults];for(const spec of p.parameters)if(spec.label==='羽化')values[spec.slot]=0;return values;}
export function node(kind='shape',type='Circle'){
 return {id:uid(),name:kind==='group'?'组合':BY_ID.get(type)?.zh??type,kind,enabled:true,type,params:shapeDefaults(type),
 transform:{x:.5,y:.5,width:1,height:1,rotation:0,mirrorX:false,pivotX:.5,pivotY:.5,fit:'stretch',lockAspect:false},opacity:1,blend:'over',seamless:false,seamMode:0,seamBlend:.2,
 uv:[1,0,0,0,0,0,0],polar:false,
 color:{mode:kind==='group'?'preserve':'inherit',fill:'gradient',low:'#000000',high:'#ffffff'},
 arrange:sanitizeArrangement([0,...Array(58).fill(undefined)]),arrangeFit:'contain',imageFit:'contain',instancePhase:0,instanceContent:'all',scatterAvoidOverlap:false,scatterGap:0,
 timing:{start:0,end:1,from:0,to:1,cycles:1,loop:false,pingpong:false,ease:'linear',outside:'hold',frozen:false,at:0,offset:0,curve:[]},
 shapeClock:{follow:true,speed:1,offset:0,value:0},contour:{mode:'none',radius:.01},animationEnabled:true,post:POST_SPECS.map(p=>p[3]),invert:false,maskInvert:false,tracks:{},children:[],mask:null};
}
export function project(){const root=node('group');root.name='作品';root.children=[node()];return {schema:TREE_SCHEMA,name:'未命名作品',root,projectResources:[],canvas:{ratio:1},output:{width:512,height:512,mode:'color',alpha:true,depth:8,seconds:3,fps:30,frames:90,columns:8,loopExport:true,exrZip:true,background:'#000000',normal:3,channels:[0,2,3,8]}};}
export function walk(root,fn,parent=null,depth=0){fn(root,parent,depth);for(const c of root.children)walk(c,fn,root,depth+1);if(root.mask)walk(root.mask,fn,root,depth+1);}
export function find(root,id){let found=null;walk(root,(n,p,d)=>{if(n.id===id)found={node:n,parent:p,depth:d};});return found;}
export function cloneNode(n){const c=structuredClone(n);walk(c,x=>x.id=uid());return c;}
export function pathGet(n,path){return path.split('.').reduce((x,k)=>x?.[k],n);}
export function pathSet(n,path,value){const parts=path.split('.');let at=n;for(const k of parts.slice(0,-1))at=at[k];at[parts.at(-1)]=value;}
export const ANIMATION_ENUMS={'contour.mode':['none','outline','dilate','erode'],blend:['over','add','max','multiply','subtract','screen','difference','overlay','softlight','dodge','mask','inverseMask'],'transform.fit':['stretch','contain'],'color.mode':['inherit','own','preserve','remap'],'color.fill':['solid','gradient']};
export const ANIMATION_BOOLS=['shapeClock.follow','enabled','transform.mirrorX','seamless','polar','invert'];
export function animationType(n,path){
 const generatorParameter=/^params\.(\d+)$/.exec(path);if(generatorParameter&&BY_ID.get(n.type)?.definition.generator){const spec=BY_ID.get(n.type).parameters.find(p=>p.slot===+generatorParameter[1]);if(spec?.step===1||spec?.type)return 'discrete';}
 if(path==='color.low'||path==='color.high')return 'color';
 if(ANIMATION_ENUMS[path]||ANIMATION_BOOLS.includes(path))return 'discrete';
 if(path==='params.0'&&BY_ID.get(n.type)?.parameters.find(p=>p.slot===0)?.label==='图片显示')return 'discrete';
 if(n.type==='Gear'&&path==='params.8'||n.type==='Halftone'&&path==='params.4'||n.type==='RingPulse'&&path==='params.4'||n.type==='ConeGradient'&&path==='params.4'||n.type==='LineSegment'&&path==='params.5')return 'discrete';
 if(/^arrange\.(0|7|19|30|37|38|39|58)$/.test(path)||n.type==='Star'&&path==='params.5'||n.type==='BezierRibbon'&&path==='params.12')return 'discrete';
 return 'number';
}
export function fieldSpec(n,path){
 if(ANIMATION_BOOLS.includes(path)||ANIMATION_ENUMS[path]||path==='color.low'||path==='color.high')return [0,1];
 const fixed={'shapeClock.speed':[-10,10],'shapeClock.offset':[-600,600],'shapeClock.value':[-36000,36000],'contour.radius':[0,.1],opacity:[0,1],instancePhase:[-1,1],'transform.x':[-2,2],'transform.y':[-2,2],'transform.width':[0,1],'transform.height':[0,1],'transform.rotation':[-3600,3600],'transform.pivotX':[0,1],'transform.pivotY':[0,1]};
 const post=/^post\.([0-6])$/.exec(path);if(post)return POST_SPECS[+post[1]].slice(1,3);
 if(fixed[path])return fixed[path];
 const uv=/^uv\.([0-6])$/.exec(path);if(uv)return [[.1,8],[-360,360],[-2,2],[-2,2],[-2,2],[-360,360],[-6.28,6.28]][+uv[1]];
 const m=/^params\.(\d+)$/.exec(path);if(m){const p=BY_ID.get(n.type)?.parameters.find(p=>p.slot===+m[1]);return p?[p.label==='羽化'?0:p.min,p.max]:null;}
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
 if(raw?.schema!==TREE_SCHEMA)throw Error('需要节点树项目格式');
 const seen=new Set();let count=0;
 function read(r,depth){
  if(!r||depth>LIMITS.depth||++count>LIMITS.nodes)throw Error('节点树超出深度12或节点256上限');
  if(!['shape','group'].includes(r.kind)||typeof r.id!=='string'||!r.id||seen.has(r.id))throw Error('节点类型或ID无效/重复');seen.add(r.id);
  if(r.kind==='shape'&&!BY_ID.has(r.type))throw Error('未知图形：'+r.type);
  const n=node(r.kind,r.type);n.id=r.id;n.name=String(r.name??n.name).slice(0,80);n.enabled=r.enabled!==false;if(typeof r.resourceRef==='string')n.resourceRef=r.resourceRef.slice(0,96);
  for(const key of ['x','y','width','height','rotation','pivotX','pivotY']){const [min,max]=fieldSpec(n,'transform.'+key);n.transform[key]=num(r.transform?.[key],n.transform[key],min,max);}
  n.transform.lockAspect=!!r.transform?.lockAspect;n.transform.mirrorX=!!r.transform?.mirrorX;n.transform.fit=r.transform?.fit==='contain'?'contain':'stretch';n.opacity=num(r.opacity,1,0,1);n.blend=['over','add','max','multiply','subtract','screen','difference','overlay','softlight','dodge','mask','inverseMask'].includes(r.blend)?r.blend:'over';n.seamless=!!r.seamless;n.seamMode=r.seamMode===1?1:0;n.seamBlend=num(r.seamBlend,.2,.05,.45);
  n.color.mode=['inherit','own','preserve','remap'].includes(r.color?.mode)?r.color.mode:n.color.mode;
  n.color.fill=r.color?.fill==='solid'?'solid':'gradient';
  for(const key of ['low','high'])n.color[key]=/^#[0-9a-f]{6}$/i.test(r.color?.[key])?r.color[key]:n.color[key];
  n.shapeClock={follow:r.shapeClock?.follow!==false,speed:num(r.shapeClock?.speed,1,-10,10),offset:num(r.shapeClock?.offset,0,-600,600),value:num(r.shapeClock?.value,0,-36000,36000)};
  n.contour={mode:ANIMATION_ENUMS['contour.mode'].includes(r.contour?.mode)?r.contour.mode:'none',radius:num(r.contour?.radius,.01,0,.1)};
  n.animationEnabled=r.animationEnabled!==false;n.post=POST_SPECS.map((p,i)=>num(r.post?.[i],p[3],p[1],p[2]));n.invert=!!r.invert;n.maskInvert=!!r.maskInvert;
  if(Array.isArray(r.color?.stops))n.color.stops=r.color.stops.slice(0,8).filter(s=>/^#[0-9a-f]{6}$/i.test(s.color)).map(s=>({color:s.color,position:num(s.position,0,0,1)})).sort((a,b)=>a.position-b.position);
  n.uv=n.uv.map((v,i)=>num(r.uv?.[i],v,...fieldSpec(n,'uv.'+i)));n.polar=!!r.polar;
  n.params=n.params.map((v,i)=>{const p=BY_ID.get(n.type)?.parameters.find(p=>p.slot===i);return p?num(r.params?.[i],v,p.label==='羽化'?0:p.min,p.max):v;});
  n.arrange=sanitizeArrangement(Array.from({length:59},(_,i)=>r.arrange?.[i]));n.arrangeFit=r.arrangeFit==='stretch'?'stretch':'contain';n.imageFit=r.imageFit==='stretch'?'stretch':'contain';n.instancePhase=num(r.instancePhase,0,-1,1);n.instanceContent=n.kind==='group'&&['random-child','cycle-child'].includes(r.instanceContent)?r.instanceContent:'all';n.scatterAvoidOverlap=r.scatterAvoidOverlap===true;n.scatterGap=num(r.scatterGap,0,0,.5);
  for(const key of ['start','end','from','to','at'])n.timing[key]=num(r.timing?.[key],n.timing[key],0,1);
  if(n.timing.end<n.timing.start)throw Error('时间区间结束不能早于开始');
  n.timing.curve=Array.isArray(r.timing?.curve)?r.timing.curve.filter(k=>Array.isArray(k)&&k.length===2&&k.every(Number.isFinite)).slice(0,128).map(k=>k.map(v=>clamp(v,0,1))).sort((a,b)=>a[0]-b[0]):[];
  n.timing.offset=num(r.timing?.offset,0,-1,1);n.timing.cycles=num(r.timing?.cycles,1,.01,64);for(const key of ['loop','pingpong','frozen'])n.timing[key]=!!r.timing?.[key];
  n.timing.ease=['linear','smooth','hold'].includes(r.timing?.ease)?r.timing.ease:'linear';n.timing.outside=r.timing?.outside==='hide'?'hide':'hold';
  for(const key of ['before','after'])if(r.timing?.[key]!==undefined)n.timing[key]=r.timing[key]==='hide'?'hide':'hold';
  for(const [path,track] of Object.entries(r.tracks??{}).slice(0,LIMITS.tracks)){
   const spec=fieldSpec(n,path);if(!spec||!track)continue;
   const type=animationType(n,path),mode=type==='number'&&['absolute','add','multiply'].includes(track.mode)?track.mode:'absolute';
   const bounds=mode==='absolute'?spec:mode==='multiply'?[-10,10]:[-10000,10000];
   const frames=new Map();for(const f of Array.isArray(track.keys)?track.keys.slice(0,LIMITS.frames):[]){
    if(!Array.isArray(f)||f.length!==2||!Number.isFinite(f[0]))continue;let v=f[1];
    if(type==='color'){if(!/^#[0-9a-f]{6}$/i.test(v))continue;}
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
  if(r.children&&!Array.isArray(r.children))throw Error('子节点列表无效');
  if(n.kind==='shape'&&r.children?.length)throw Error('图形节点不能持有普通子节点；请创建组合');
  n.children=(r.children??[]).map(c=>read(c,depth+1));if(r.mask)n.mask=read(r.mask,depth+1);return n;
 }
 const p=project();p.root=read(raw.root,0);
 if(raw.projectResources!==undefined){if(!Array.isArray(raw.projectResources))throw Error('图形列表格式无效');const ids=new Set();p.projectResources=raw.projectResources.map(entry=>{if(!entry||typeof entry.id!=='string'||ids.has(entry.id))throw Error('图形列表ID无效或重复');ids.add(entry.id);const clean=sanitizeTree({...project(),root:entry.root,projectResources:[]},{component:true}).root;return {id:entry.id,name:String(entry.name??clean.name).slice(0,80),category:String(entry.category??'图形列表').slice(0,80),description:String(entry.description??'').slice(0,2000),kind:['formula','image','composition'].includes(entry.kind)?entry.kind:'composition',resourceId:typeof entry.resourceId==='string'?entry.resourceId:uid(),versionId:Math.max(1,Math.floor(num(entry.versionId,1,1,1000000000))),personalRevision:Math.floor(num(entry.personalRevision,0,0,1000000000)),source:entry.source?{resourceId:String(entry.source.resourceId).slice(0,128),versionId:Math.max(1,Math.floor(num(entry.source.versionId,1,1,1000000000)))}:null,root:clean};});}
if(!component)p.root=canvasRoot(p.root);p.name=String(raw.name??p.name).slice(0,80);
 for(const [key,min,max] of [['width',1,4096],['height',1,4096],['columns',1,32],['depth',8,16],['seconds',.05,600],['normal',0,20]])p.output[key]=num(raw.output?.[key],p.output[key],min,max);
 for(const key of ['width','height','columns'])p.output[key]=Math.round(p.output[key]);p.output.depth=p.output.depth===16?16:8;
 p.output.channels=Array.from({length:4},(_,i)=>Math.round(num(raw.output?.channels?.[i],p.output.channels[i],0,9)));
 if(/^#[0-9a-f]{6}$/i.test(raw.output?.background))p.output.background=raw.output.background;
 p.canvas.ratio=num(raw.canvas?.ratio,p.output.width/p.output.height,1/8,8);
 p.output.mode=['color','height','normal','rgba'].includes(raw.output?.mode)?raw.output.mode:'color';p.output.alpha=raw.output?.alpha!==false;p.output.exrZip=raw.output?.exrZip!==false;p.output.loopExport=raw.output?.loopExport!==false;
 const legacy=Number(raw.output?.frames);const fallback=Number.isFinite(legacy)?Math.max(1,legacy-(p.output.loopExport?0:1))/p.output.seconds:30;
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
export function evaluateNode(n,parentTime,progressOverride){const clock=localClock(n.timing,parentTime);if(progressOverride!==undefined)clock.progress=progressOverride;const out={...n,transform:{...n.transform},color:{...n.color},contour:{...n.contour},shapeClock:{follow:true,speed:1,offset:0,value:0,...n.shapeClock},post:[...n.post],params:[...n.params],uv:[...n.uv],arrange:[...n.arrange]};for(const [path,track]of Object.entries(n.animationEnabled===false?{}:n.tracks)){const v=keyValue(track,clock.progress),bounds=fieldSpec(n,path);if(track.muted||v===null||!bounds)continue;if(animationType(n,path)!=='number'){pathSet(out,path,v);continue;}const base=pathGet(n,path);pathSet(out,path,clamp(track.mode==='add'?base+v:track.mode==='multiply'?base*v:v,...bounds));}out.arrange=sanitizeArrangement(out.arrange);return {node:out,...clock,visible:clock.visible&&out.enabled&&out.transform.width>0&&out.transform.height>0};}
export function nodeClock(root,id,time){let result=null;function visit(n,t){const e=evaluateNode(n,t);if(n.id===id)result=e;for(const c of n.children)visit(c,e.progress);if(n.mask)visit(n.mask,e.progress);}visit(root,time);return result;}
export function moveNode(root,id,parentId,index=Infinity){const source=find(root,id),target=find(root,parentId);if(!source?.parent||!target||target.node.kind!=='group')throw Error('请选择可移动节点和目标组合');if(find(source.node,parentId))throw Error('不能移入自身或后代');if(source.parent.mask===source.node)source.parent.mask=null;else source.parent.children.splice(source.parent.children.indexOf(source.node),1);target.node.children.splice(Math.min(index,target.node.children.length),0,source.node);}
export function removeNode(root,id){const x=find(root,id);if(!x?.parent)throw Error('不能删除作品根节点');if(x.parent.mask===x.node)x.parent.mask=null;else x.parent.children.splice(x.parent.children.indexOf(x.node),1);}
export const scatterOptions=(n,aspect=1)=>({avoidOverlap:n.scatterAvoidOverlap===true,gap:n.scatterGap??0,wrap:!!n.seamless,aspect,fit:n.arrangeFit??'contain'});
export function placements(a,n={},_time=0,_original=n,aspect=1){const records=rawPlacements(a,n,aspect);return a[0]?fitInstances(records,aspect,n.arrangeFit??'contain'):records;}
function rawPlacements(a,n={},aspect=1){
 if(!a[0])return [{x:.5,y:.5,width:1,height:1,turn:0,mirror:1}];
 if([1,4].includes(a[0])){let seed=a[11]>>>0;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const points=[];for(let y=0;y<a[2];y++)for(let x=0;x<a[1];x++){
 const jx=(rng()*2-1)*a[8]/a[1],jy=(rng()*2-1)*a[8]/a[2],size=1+(rng()*2-1)*a[9],spin=a[6]*Math.PI/180,turn=spin+(rng()*2-1)*a[10]*Math.PI/180;
 const px=(x+.5+(y%2)*(a[0]===4?.5:a[12]))/a[1]-.5+jx,py=(y+.5)/a[2]-.5+jy,c=Math.cos(spin),sn=Math.sin(spin);
 points.push({x:.5+c*px-sn*py+a[13],y:.5+sn*px+c*py+a[14],width:Math.min(1,size/a[1]),height:Math.min(1,size/a[2]),turn,mirror:1});}return points;}
 if(a[0]===5){let seed=a[11]>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};return Array.from({length:a[3]},(_,i)=>{const f=i/Math.max(1,a[3]-1),angle=(i*a[16]+a[6])*Math.PI/180,r=a[5]*Math.sqrt(a[17]**2+(1-a[17]**2)*f),size=a[4]*(1+(a[18]-1)*f)*(1+(random()*2-1)*a[9]);return{x:.5+Math.cos(angle)*r+a[13]+(random()*2-1)*a[8]*a[5],y:.5+Math.sin(angle)*r+a[14]+(random()*2-1)*a[8]*a[5],width:Math.min(1,size),height:Math.min(1,size),turn:(random()*2-1)*a[10]*Math.PI/180+(a[19]?angle-Math.PI/2+(a[19]===2?Math.PI/2:0):a[6]*Math.PI/180),mirror:1};});}
 return generateArrangement(a,scatterOptions(n,aspect)).map(p=>({...p,width:Math.min(1,p.size),height:Math.min(1,p.size),turn:-p.turn}));
}
// Stable per-slot hash: choices survive cloning, serialization and animation sampling.
export function instanceChildren(n,index){
 if(n.kind!=='group'||!['random-child','cycle-child'].includes(n.instanceContent))return n.children;
 const pool=n.children.filter(c=>c.enabled);if(!pool.length)return [];
 if(n.instanceContent==='cycle-child')return [pool[index%pool.length]];
 let h=((n.arrange[11]>>>0)^Math.imul(index+1,0x9e3779b9))>>>0;
 h=Math.imul(h^(h>>>16),0x21f0aaad);h=Math.imul(h^(h>>>15),0x735a2d97);h=(h^(h>>>15))>>>0;
 return [pool[Math.floor(h/4294967296*pool.length)]];
}
export function expandInstances(root,id,time,records){const entry=find(root,id);if(!entry)throw Error('节点不存在');const n=entry.node,e=nodeClock(root,id,time);if(!n.arrange[0])throw Error('节点没有排列');
 const points=records??placements(e.node.arrange,e.node),content=cloneNode(n);content.transform=node().transform;content.opacity=1;content.blend='over';content.arrange[0]=0;content.seamless=n.seamless;if(content.color.mode==='remap')content.color.mode='own';content.instancePhase=0;content.mask=null;content.post=POST_SPECS.map(p=>p[3]);content.contour=node().contour;content.invert=false;content.maskInvert=false;content.timing=node().timing;
 for(const path of Object.keys(content.tracks))if(path.startsWith('arrange.')||path.startsWith('transform.')||path==='opacity'||path.startsWith('post.')||path.startsWith('contour.'))delete content.tracks[path];
 const result=node('group');Object.assign(result,{id:n.id,name:n.name,transform:n.transform,opacity:n.opacity,blend:n.blend,seamless:n.seamless,seamMode:n.seamMode,seamBlend:n.seamBlend,timing:n.timing,animationEnabled:n.animationEnabled,mask:n.mask,maskInvert:n.maskInvert,post:n.post,contour:n.contour,invert:n.invert,color:n.color});result.tracks=Object.fromEntries(Object.entries(n.tracks).filter(([p])=>p.startsWith('transform.')||p==='opacity'||p.startsWith('post.')||p.startsWith('contour.')));
 let size=0;walk(root,()=>size++);walk(n,()=>size--);walk(result,()=>size++);
 for(let i=0;i<points.length;i++){size++;for(const c of instanceChildren(e.node,i))walk(c,()=>size++);if(size>LIMITS.nodes)throw Error('展开后超出256节点限制');}
 result.children=points.map((p,i)=>{const c=cloneNode({...content,children:instanceChildren(e.node,i)});c.instanceContent='all';c.name=`${n.name} ${i+1}`;c.transform={...c.transform,x:p.x,y:p.y,width:p.width,height:p.height,rotation:p.turn*180/Math.PI};c.transform.mirrorX=p.mirror<0;c.timing.offset=i*e.node.instancePhase%1;return c;});
 walk(result,(_n,_p,d)=>{if(d+entry.depth>LIMITS.depth)throw Error('展开后超出节点深度限制');});
 if(!entry.parent)return result;if(entry.parent.mask===n)entry.parent.mask=result;else entry.parent.children[entry.parent.children.indexOf(n)]=result;return root;
}

export function exportFrameCount(o){return Math.max(1,Math.ceil(o.seconds*o.fps-1e-9))+(o.loopExport?0:1);}
export function exportFrameProgress(o,i){return Math.min(1,i/(o.fps*o.seconds));}
