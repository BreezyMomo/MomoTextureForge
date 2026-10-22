import {messageError} from './message-catalog.js';
import {sanitizeArrangement} from './arrangement.js';
import {ARRANGEMENT_LIMITS as LIMITS} from './arrangement-limits.js';

export const EXTRA_LAYOUTS=[[13,"examples.borderPlacement"],[14,"examples.alongShapeContour"],[15,"ui.herringboneWeave"],[16,"examples.ruleTiling"]];
export const EXTRA_SPECS={
 width:["ui.borderWidth",.05,1,.01,.84],height:["ui.borderHeight",.05,1,.01,.68],corner:["ui.cornerRadius",0,.5,.005,.08],
 offset:["ui.pathOffset",-1,1,.01,0],threshold:["editor.contourAlphaThreshold",.01,.99,.01,.5],contourOffset:["ui.contourNormalOffset",-.2,.2,.005,0],
 scaleFrom:["ui.startSizeFactor",.01,4,.01,1],scaleTo:["arrangement.endSizeFactor",.01,4,.01,1],opacityFrom:["ui.startOpacity",0,1,.01,1],opacityTo:["ui.endOpacity",0,1,.01,1],
 rotationFrom:["ui.startRotation",-360,360,1,0],rotationTo:["ui.endRotation",-360,360,1,0],
 flowAmount:["ui.flowAmplitude",-.5,.5,.005,.05],flowFrequency:["arrangement.waveCount",1,24,1,2],flowPhase:["ui.flowPhase",-3600,3600,1,0],
};
export const EXTRA_ENUMS={gradient:['none','x','y','radial','index'],flow:['none','wave','vortex'],weave:['herringbone','basket']};
export const EXTRA_BOOLS=['reverse','flowTurn','showSource'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
const metric=aspect=>aspect>=1?[aspect,1]:[1,1/aspect];
export function extraDefaults(){return {...Object.fromEntries(Object.entries(EXTRA_SPECS).map(([key,s])=>[key,s[4]])),gradient:'none',flow:'none',weave:'herringbone',reverse:false,flowTurn:true,showSource:false};}
export function sanitizeExtra(raw){const result=extraDefaults();for(const [key,s]of Object.entries(EXTRA_SPECS)){const v=Number(raw?.[key]);if(Number.isFinite(v))result[key]=s[3]===1?Math.round(clamp(v,s[1],s[2])):clamp(v,s[1],s[2]);}for(const [key,options]of Object.entries(EXTRA_ENUMS))if(options.includes(raw?.[key]))result[key]=raw[key];for(const key of EXTRA_BOOLS)if(typeof raw?.[key]==='boolean')result[key]=raw[key];return result;}
// New tree layouts do not alter the legacy scalar-pattern arrangement ABI.
export function sanitizeTreeArrangement(raw){const a=sanitizeArrangement(raw),mode=Number(raw?.[0]);a[0]=Number.isFinite(mode)?Math.round(clamp(mode,0,16)):0;if(a[0]===15){a[1]=Math.min(LIMITS.weaveBlocks,a[1]);a[2]=Math.min(LIMITS.weaveBlocks,a[2]);}return a;}

function distances(points,aspect){const [mx,my]=metric(aspect),segments=[];let length=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=(b[0]-a[0])*mx,dy=(b[1]-a[1])*my,l=Math.hypot(dx,dy);if(l>1e-8){segments.push({a,b,dx,dy,start:length,length:l});length+=l;}}return {segments,length};}
export function sampleOutline(loops,a,extra,aspect=1){
 const paths=loops.map(points=>distances(points,aspect)).filter(p=>p.length>1e-6),total=paths.reduce((sum,p)=>sum+p.length,0);if(!total)return [];
 const count=a[30]?Math.min(LIMITS.instances,Math.max(1,Math.floor(total/a[31]))):Math.max(1,Math.min(LIMITS.instances,a[3])),[mx,my]=metric(aspect),records=[];
 for(let i=0;i<count;i++){
  const phase=i/count+extra.offset;let distance=(phase-Math.floor(phase))*total,path=paths[0];for(const candidate of paths){path=candidate;if(distance<candidate.length-total*1e-12)break;distance=Math.max(0,distance-candidate.length);}
  const segment=path.segments.find(s=>distance<=s.start+s.length)??path.segments.at(-1),t=clamp((distance-segment.start)/segment.length),angle=Math.atan2(segment.dy,segment.dx),size=a[4];
  const offset=a[0]===14?extra.contourOffset:0;
  records.push({x:segment.a[0]+(segment.b[0]-segment.a[0])*t+Math.sin(angle)*offset/mx,y:segment.a[1]+(segment.b[1]-segment.a[1])*t-Math.cos(angle)*offset/my,width:size,height:size,turn:a[19]===1?angle-Math.PI/2:a[19]===2?angle:0,mirror:1});
 }
 return records;
}
function border(a,extra,aspect){
 const [mx,my]=metric(aspect),w=extra.width*mx,h=extra.height*my,r=Math.min(extra.corner,w/2,h/2),points=[];
 for(const [cx,cy,start]of [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,Math.PI/2],[-w/2+r,-h/2+r,Math.PI],[w/2-r,-h/2+r,Math.PI*1.5]])for(let j=0;j<=16;j++){const angle=start+j/16*Math.PI/2;points.push([.5+(cx+Math.cos(angle)*r)/mx,.5+(cy+Math.sin(angle)*r)/my]);}
 return sampleOutline([points],a,extra,aspect);
}
function weave(a,extra,aspect){
 const cols=a[1]*4,rows=a[2]*4,result=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const horizontal=extra.weave==='herringbone'?(x+y)%4===0:(Math.floor(x/2)+Math.floor(y/2))%2===0&&x%2===0;
  const vertical=extra.weave==='herringbone'?(x+y)%4===2:(Math.floor(x/2)+Math.floor(y/2))%2===1&&y%2===0;
  if(horizontal)result.push({x:(x+1)/cols,y:(y+.5)/rows,width:2/cols,height:1/rows,turn:0,mirror:1});
  if(vertical)result.push({x:(x+.5)/cols,y:(y+1)/rows,width:2/rows/aspect,height:aspect/cols,turn:Math.PI/2,mirror:1});
 }
 return result;
}
function random(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function matchedTiles(n){
 if(n.kind!=='group')throw messageError("ui.ruleTilingRequiresAGroupWithConnectorTilesAsDirectChildren");
 const a=n.arrange,cols=a[1],rows=a[2],pool=n.children.map((child,index)=>({mask:child.tileEdges??0,index})).filter(c=>n.children[c.index].enabled),rng=random(a[11]);
 if(!pool.length)return [];
 const choices=Array.from({length:cols*rows},()=>pool.map(item=>({item,key:rng()})).sort((a,b)=>a.key-b.key).map(x=>x.item)),board=new Array(cols*rows);let attempts=0;
 const port=(item,bit)=>!!(item.mask&bit);
 function solve(i){if(i===board.length)return true;if(++attempts>50000)throw messageError("ui.ruleTilingSearchLimitReachedAddConnectorTilesReduceRowsColumns");const x=i%cols,y=Math.floor(i/cols);
  for(const tile of choices[i]){
   if(x&&port(board[i-1],1)!==port(tile,4)||y&&port(board[i-cols],2)!==port(tile,8))continue;
   if((n.boundary==='repeat')){if(x===cols-1&&port(tile,1)!==port(x?board[i-x]:tile,4))continue;if(y===rows-1&&port(tile,2)!==port(y?board[x]:tile,8))continue;}
   else if(x===0&&port(tile,4)||x===cols-1&&port(tile,1)||y===0&&port(tile,8)||y===rows-1&&port(tile,2))continue;
   board[i]=tile;if(solve(i+1))return true;
  }return false;
 }
 if(!solve(0))throw messageError("ui.cannotMatchTileConnectorsAddCornersEndpointsOrBlankTilesOr");
 return board.map((tile,i)=>({x:(i%cols+.5)/cols,y:(Math.floor(i/cols)+.5)/rows,width:1/cols,height:1/rows,turn:0,mirror:1,childIndex:tile.index}));
}
export function advancedRecords(n,aspect=1,loops=[]){
 const a=n.arrange,e=n.arrangeExtra??extraDefaults();let records=a[0]===13?border(a,e,aspect):a[0]===14?sampleOutline(loops,a,e,aspect):a[0]===15?weave(a,e,aspect):matchedTiles(n);
 if(a[0]!==16){const spin=a[6]*Math.PI/180,c=Math.cos(spin),s=Math.sin(spin);records=records.map(r=>{const x=(r.x-.5)*aspect,y=r.y-.5;return {...r,x:.5+(x*c-y*s)/aspect+a[13],y:.5+x*s+y*c+a[14],turn:r.turn+spin};});}
 return records;
}
export function modifyRecords(records,n,aspect=1){
 const e=n.arrangeExtra??extraDefaults();if(!n.arrange[0]||n.arrange[0]===16||n.scatterAvoidOverlap&&[7,12].includes(n.arrange[0])||e.gradient==='none'&&e.flow==='none')return records;
 const [mx,my]=metric(aspect),mix=(a,b,t)=>a+(b-a)*t;
 return records.map((r,i)=>{
  let t=e.gradient==='x'?r.x:e.gradient==='y'?r.y:e.gradient==='radial'?Math.hypot(r.x-.5,r.y-.5)/Math.SQRT1_2:i/Math.max(1,records.length-1);t=clamp(t);if(e.reverse)t=1-t;
  const scale=e.gradient==='none'?1:mix(e.scaleFrom,e.scaleTo,t),angle=e.gradient==='none'?0:mix(e.rotationFrom,e.rotationTo,t)*Math.PI/180;
  let x=r.x,y=r.y,turn=r.turn+angle;
  if(e.flow==='wave'){const phase=TAU*e.flowFrequency*x+e.flowPhase*Math.PI/180;y+=e.flowAmount*Math.sin(phase);if(e.flowTurn)turn+=Math.atan2(e.flowAmount*TAU*e.flowFrequency*Math.cos(phase)*my,mx);}
  if(e.flow==='vortex'){const dx=(x-.5)*mx,dy=(y-.5)*my,theta=e.flowAmount*TAU*(1-clamp(Math.hypot(dx,dy)/.5))+e.flowPhase*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);x=.5+(c*dx-s*dy)/mx;y=.5+(s*dx+c*dy)/my;if(e.flowTurn)turn+=theta;}
  return {...r,x,y,width:clamp(r.width*scale,.00001,1),height:clamp(r.height*scale,.00001,1),turn,opacity:(r.opacity??1)*(e.gradient==='none'?1:mix(e.opacityFrom,e.opacityTo,t))};
 });
}
