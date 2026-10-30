import {MIN_SPLIT_RATIO,MAX_SPLIT_RATIO} from './layout.js';

// Snapshot coordinates on the dragged axis. Descendant dividers keep their
// original coordinates; only leaves touching the moving edge absorb the delta.
export function createSplitResize(root,size,{gap=6,minPane=root.axis==='x'?96:72}={}){
 const splits=[];let minDelta=-Infinity,maxDelta=Infinity;
 function constrain(value,slope){
  if(slope>0)minDelta=Math.max(minDelta,-value/slope);
  else if(slope<0)maxDelta=Math.min(maxDelta,-value/slope);
 }
 function walk(n,start,end,startSlope,endSlope){
  const length=end-start,slope=endSlope-startSlope;
  if(n.kind==='stack'){
   // Existing small panels can grow without jumping on pointerdown.
   constrain(length-Math.min(minPane,Math.max(0,length)),slope);return;
  }
  if(n.axis!==root.axis){walk(n.first,start,end,startSlope,endSlope);walk(n.second,start,end,startSlope,endSlope);return;}
  const center=start+length*n.ratio,centerSlope=n===root?1:0;
  splits.push({node:n,ratio:n.ratio,start,end,startSlope,endSlope,center,centerSlope});
  constrain(center-start-MIN_SPLIT_RATIO*length,centerSlope-startSlope-MIN_SPLIT_RATIO*slope);
  constrain(MAX_SPLIT_RATIO*length-center+start,MAX_SPLIT_RATIO*slope-centerSlope+startSlope);
  walk(n.first,start,center-gap/2,startSlope,centerSlope);
  walk(n.second,center+gap/2,end,centerSlope,endSlope);
 }
 walk(root,0,size,0,0);
 return {
  splits,minDelta,maxDelta,
  resize(delta){
   delta=Math.max(minDelta,Math.min(maxDelta,delta));
   for(const s of splits){
    const start=s.start+s.startSlope*delta,end=s.end+s.endSlope*delta;
    s.node.ratio=(s.center+s.centerSlope*delta-start)/Math.max(1,end-start);
   }
   return delta;
  },
  restore(){for(const s of splits)s.node.ratio=s.ratio;}
 };
}
