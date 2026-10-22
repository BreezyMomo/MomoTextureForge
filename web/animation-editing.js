import {messageError} from './message-catalog.js';
import {BY_ID as CLOCK_TYPES} from './catalog.js';
import {find,pathGet,fieldSpec,animationType,keyValue,ANIMATION_BOOLS,ANIMATION_ENUMS,LIMITS} from './tree-model.js';
import {timeKey} from './animation-values.js';
export const roundTime=t=>Math.round(Math.max(0,Math.min(1,t))*1e6)/1e6;
export const sameTime=(a,b)=>Math.abs(a-b)<1e-6;
export function encodedValue(n,path,value,mode=n.tracks[path]?.mode??'absolute'){
 if(animationType(n,path)!=='number')return value;const base=pathGet(n,path);
 if(mode==='multiply'&&Math.abs(base)<1e-12)throw messageError("ui.theBaseValueIsSoAMultiplyTrackCannotBeRecorded");
 return mode==='add'?value-base:mode==='multiply'?value/base:value;
}
export function recordValue(n,path,time,value){
 if(!fieldSpec(n,path))throw messageError("ui.thisParameterCannotBeAnimated");
 if(!n.tracks[path]&&Object.keys(n.tracks).length>=LIMITS.tracks)throw messageError("ui.thisNodeHasReachedTheTrackLimit");
 const type=animationType(n,path),t=roundTime(time),fresh=!n.tracks[path],track=n.tracks[path]??{mode:'absolute',ease:type==='discrete'?'hold':'linear',keys:[]};
 const v=encodedValue(n,path,value,track.mode);if(track.muted)throw messageError("ui.enableThisTrackBeforeRecording");
 if(!n.animationEnabled)throw messageError("ui.enableNodeParameterAnimationBeforeRecording");
 if(!track.keys.some(k=>sameTime(k[0],t))&&track.keys.length>=LIMITS.frames)throw messageError("ui.trackKeyframeLimitReached");
 if(fresh&&t>0)track.keys.push([0,encodedValue(n,path,pathGet(n,path),track.mode)]);
 track.keys=track.keys.filter(k=>!sameTime(k[0],t));track.keys.push([t,v]);track.keys.sort((a,b)=>a[0]-b[0]);if(type!=='number')track.type=type;n.tracks[path]=track;
}
// A source key may occur multiple times after looping: only invert affine clocks.
export function affineClock(chain){let a=1,b=0,lo=0,hi=1;
 for(const n of chain){const t=n.timing,span=t.end-t.start;if(t.loop||t.frozen||t.curve?.length||t.ease!=='linear'||Math.abs(t.offset)>1e-9||t.cycles!==1||span<=0||t.from===t.to)return null;
  const x=(t.start-b)/a,y=(t.end-b)/a;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));
  const scale=(t.to-t.from)/span;b=t.from+(b-t.start)*scale;a*=scale;
 }return {forward:t=>a*t+b,inverse:t=>(t-b)/a,lo,hi};}
export function snapTime(t,mode,others=[],frames=30,threshold=.008){
 let v=mode==='frames'?Math.round(t/ (1/Math.max(1,frames)))/Math.max(1,frames):mode==='grid'?Math.round(t*100)/100:t;
 if(mode!=='off'){const close=others.filter(x=>Math.abs(x-t)<=threshold).sort((a,b)=>Math.abs(a-t)-Math.abs(b-t))[0];if(close!==undefined)v=close;}
 return roundTime(v);
}
// Validate the whole transaction before applying any track; collisions never delete unrelated keys.
export function editKeys(root,edits){
 const groups=new Map();for(const e of edits){const n=find(root,e.id)?.node,track=n?.tracks[e.path];if(!track)throw messageError("ui.trackNoLongerExists");const key=e.id+'|'+e.path;if(!groups.has(key))groups.set(key,{n,path:e.path,track,next:structuredClone(track),edits:[]});groups.get(key).edits.push(e);}
 const result=[];
 for(const g of groups.values()){
  const removed=g.edits.filter(e=>e.from!==undefined).map(e=>e.from);
  g.next.keys=g.track.keys.filter(k=>!removed.some(t=>sameTime(t,k[0])));
  if(g.next.segments)for(const t of removed)delete g.next.segments[timeKey(t)];
  for(const e of g.edits){if(e.remove)continue;const old=g.track.keys.find(k=>sameTime(k[0],e.from)),t=roundTime(e.to);if(!Number.isFinite(e.to)||e.to<0||e.to>1)throw messageError("ui.keyframesMustStayWithin");
   if(g.next.keys.some(k=>sameTime(k[0],t)))throw messageError("ui.aKeyframeAlreadyExistsAtThatTimeMoveToAnEmpty");
   const value=e.value!==undefined?e.value:old?.[1];if(value===undefined)throw messageError("ui.keyframeNoLongerExists");
   g.next.keys.push([t,value]);const segment=e.segment??g.track.segments?.[timeKey(e.from)];if(segment){g.next.segments??={};g.next.segments[timeKey(t)]=structuredClone(segment);}result.push({id:e.id,path:e.path,time:t});
  }
  if(g.next.keys.length>LIMITS.frames)throw messageError("ui.trackKeyframeLimitReached");g.next.keys.sort((a,b)=>a[0]-b[0]);
 }
 for(const g of groups.values()){if(g.next.keys.length)g.n.tracks[g.path]=g.next;else delete g.n.tracks[g.path];}return result;
}
export function convertTrack(n,path,mode){const track=n.tracks[path];if(!track)return;if(animationType(n,path)!=='number'&&mode!=='absolute')throw messageError("ui.colorAndOptionTracksSupportAbsoluteModeOnly");
 const base=pathGet(n,path),oldMode=track.mode,decode=v=>oldMode==='add'?base+v:oldMode==='multiply'?base*v:v;
 const values=track.keys.map(([t,v])=>[t,encodedValue(n,path,decode(v),mode)]);
 const factor=(oldMode==='multiply'?base:1)/(mode==='multiply'?base:1);if(track.segments)for(const s of Object.values(track.segments))for(const k of ['in','out'])if(s[k]!==undefined)s[k]*=factor;
 track.keys=values;track.mode=mode;
}
export function animatablePaths(n){const paths=['shapeClock.value','shapeClock.speed','shapeClock.offset','contour.radius','opacity','transform.x','transform.y','transform.width','transform.height','transform.rotation','transform.pivotX','transform.pivotY',...ANIMATION_BOOLS,...Object.keys(ANIMATION_ENUMS),'color.low','color.high','instancePhase',...Array.from({length:7},(_,i)=>'uv.'+i),...Array.from({length:7},(_,i)=>'post.'+i),...Array.from({length:7},(_,i)=>'postFx.'+i)];
 for(let i=0;i<(CLOCK_TYPES.get(n.type)?.defaults.length??16);i++)if(fieldSpec(n,'params.'+i)&&n.kind==='shape')paths.push('params.'+i);for(let i=0;i<59;i++)if(fieldSpec(n,'arrange.'+i))paths.push('arrange.'+i);return paths.filter(p=>!p.startsWith('shapeClock.')||n.kind==='shape'&&CLOCK_TYPES.get(n.type)?.usesTime);
}
export const ANIMATION_TEMPLATES=[['pulse','呼吸缩放'],['fade','淡入淡出'],['rotate','旋转一周'],['pop','弹出'],['slide','横向进入'],['uv','UV滚动']];
export function templateTracks(n,name){const absolute=(keys,ease='smooth')=>({mode:'absolute',ease,keys}),w=n.transform.width,h=n.transform.height;
 if(name==='pulse')return Object.fromEntries([['width',w],['height',h]].map(([p,v])=>['transform.'+p,absolute([[0,v*.65],[.5,v],[1,v*.65]])]));
 if(name==='fade')return {opacity:absolute([[0,0],[.2,n.opacity],[.8,n.opacity],[1,0]])};
 if(name==='rotate')return {'transform.rotation':absolute([[0,n.transform.rotation],[1,n.transform.rotation+360]],'linear')};
 if(name==='pop')return Object.fromEntries([['width',w],['height',h]].map(([p,v])=>['transform.'+p,absolute([[0,0],[.6,Math.min(1,v*1.1)],[.8,v*.95],[1,v]])]));
 if(name==='slide')return {'transform.x':absolute([[0,n.transform.x-.5],[1,n.transform.x]])};
 if(name==='uv')return {'uv.2':absolute([[0,n.uv[2]],[1,n.uv[2]+1]],'linear')};return {};
}
