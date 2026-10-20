import {localClock} from './tree-model.js';
import {affineClock} from './animation-editing.js';
const EPS=1e-10,MAX_RANGES=2048;
// Split at every clock discontinuity and curve knot, then invert each monotone piece.
// This preserves very short repeated intervals without fixed-rate sampling.
function parentRanges(t,ranges){
 const span=t.end-t.start;if(span<=EPS)return [];
 const knots=t.curve?.length?[0,1,...t.curve.map(k=>k[0])]:[0,1],raw=[t.start,t.end];
 if(!t.frozen){for(let cycle=0;cycle<(t.loop?Math.ceil(t.cycles):1);cycle++)for(const p of knots){const q=cycle+(t.loop&&t.pingpong&&cycle%2?1-p:p);if(q>=0&&q<=t.cycles)raw.push(t.start+span*q/t.cycles);}}
 const offset=((t.offset%1)+1)%1,points=[0,1];
 for(const x of [...raw,0,1])for(const k of [-1,0,1]){const v=x-offset+k;if(v>0&&v<1)points.push(v);}
 points.sort((a,b)=>a-b);const cuts=points.filter((v,i)=>!i||v-points[i-1]>EPS),result=[];
 for(let i=1;i<cuts.length;i++){
  const a=cuts[i-1],b=cuts[i],mid=(a+b)/2,shifted=offset?((mid+offset)%1):mid;
  if(shifted<t.start||shifted>t.end)continue;
  const pad=Math.min((b-a)*1e-7,1e-10),value=x=>localClock(t,x).progress,va=value(a+pad),vb=value(b-pad),low=Math.min(va,vb),high=Math.max(va,vb);
  for(const [left,right]of ranges){
   if(right<low-EPS||left>high+EPS)continue;
   if(Math.abs(vb-va)<EPS){if(value(mid)>=left-EPS&&value(mid)<=right+EPS)result.push([a,b]);continue;}
   const inverse=target=>{if(Math.abs(target-va)<EPS)return a;if(Math.abs(target-vb)<EPS)return b;let lo=a,hi=b;for(let j=0;j<44;j++){const m=(lo+hi)/2;if((value(m)<target)===(vb>va))lo=m;else hi=m;}return (lo+hi)/2;};
   const x=inverse(Math.max(left,low)),y=inverse(Math.min(right,high));result.push([Math.min(x,y),Math.max(x,y)]);
   if(result.length>MAX_RANGES)return null;
  }
 }
 return result.sort((a,b)=>a[0]-b[0]);
}
export function intervalProjection(parentChain,start,end){
 const affine=affineClock(parentChain);
 if(affine){const x=affine.inverse(start),y=affine.inverse(end),lo=Math.max(0,affine.lo),hi=Math.min(1,affine.hi),a=Math.max(lo,Math.min(x,y)),b=Math.min(hi,Math.max(x,y));
  return {ranges:b>=a?[[a,b]]:[],map:affine,editable:Math.min(x,y)>=lo-EPS&&Math.max(x,y)<=hi+EPS&&hi>lo,reversed:y<x};
 }
 let ranges=[[start,end]];for(const n of [...parentChain].reverse()){ranges=parentRanges(n.timing,ranges);if(ranges===null)return {ranges:[],editable:false,dense:true};}
 return {ranges,editable:false};
}
