import {canvasRoot,evaluateNode,find,placements,shiftedProgress,instanceChildren} from './tree-model.js';
import {rotateRegion} from './instance-geometry.js';

export function outputDimensions(ratio,value,axis='width'){
 const edge=Math.max(1,Math.min(4096,Math.round(Number(value)||1)));
 let w=axis==='width'?edge:edge*ratio,h=axis==='height'?edge:edge/ratio;
 const shrink=Math.min(1,4096/Math.max(w,h));
 return {width:Math.max(1,Math.round(w*shrink)),height:Math.max(1,Math.round(h*shrink))};
}
export function previewDimensions(ratio,width,height,zoom=1,copies=1,dpr=1,maxEdge=1024){
 const fit=Math.max(1,Math.min(width/ratio,height)),displayHeight=fit*zoom,displayWidth=displayHeight*ratio;
 const edge=Math.max(64,Math.min(maxEdge,Math.ceil(Math.max(displayWidth,displayHeight)*dpr/copies/32)*32));
 return {displayWidth,displayHeight,width:Math.max(1,Math.round(ratio>=1?edge:edge*ratio)),height:Math.max(1,Math.round(ratio>=1?edge/ratio:edge))};
}
// Coordinates are normalized bottom-left UVs, matching the compositor. Guides never enter export.
const ident=p=>p;
function mapping(t,w,h){
 let sx=t.width,sy=t.height;
 if(t.fit==='contain'){const side=Math.min(sx*w,sy*h);sx=side/w;sy=side/h;}
 const a=t.rotation*Math.PI/180;
 return {width:w*sx,height:h*sy,point:p=>{const x=(p[0]-t.pivotX)*sx*(t.mirrorX?-1:1),y=(p[1]-t.pivotY)*sy,[rx,ry]=rotateRegion(x,y,a,w,h);return [t.x+rx,t.y+ry];}};
}
export function selectionRegions(project,id,time,{solo=false,records=placements}={}){
 const regions=[];
 const start=solo?find(project.root,id)?.node:project.root;if(!start)return {regions};
 const chain=[];let entry=find(project.root,start.id);while(entry?.parent){chain.unshift(entry.parent);entry=find(project.root,entry.parent.id);}
 let parentTime=time;for(const n of chain)parentTime=evaluateNode(n.id===project.root.id?canvasRoot(n):n,parentTime).progress;
 function visit(original,t,parentPoint,w,h){
  const e=evaluateNode(original.id===project.root.id?canvasRoot(original):original,t),n=e.node;if(!e.visible)return;
  const m=mapping(n.transform,w,h),point=p=>parentPoint(m.point(p));
  if(n.id===id){regions.push({corners:[[0,0],[1,0],[1,1],[0,1]].map(point),center:point([.5,.5]),pivot:point([n.transform.pivotX,n.transform.pivotY]),point,parentPoint,parentWidth:w,parentHeight:h,aspect:m.width/m.height,transform:{...n.transform},progress:e.progress});return;}
  const children=[...n.children,...(n.mask?[n.mask]:[])].filter(c=>find(c,id));if(!children.length)return;
  // The node's mask is applied after its arrangement, and is not repeated by that arrangement.
  for(const child of children){
   const items=child===n.mask?[{x:.5,y:.5,width:1,height:1,turn:0,mirror:1}]:records(n.arrange,n,e.progress,original,m.width/m.height);
   for(let i=0;i<items.length;i++){
    if(child!==n.mask&&n.arrange[0]&&!instanceChildren(n,i).includes(child))continue;
    const r=items[i],rm=mapping({x:r.x,y:r.y,width:r.width,height:r.height,pivotX:.5,pivotY:.5,rotation:r.turn*180/Math.PI,mirrorX:r.mirror<0},m.width,m.height);
    visit(child,child===n.mask?e.progress:shiftedProgress(e.progress,i*n.instancePhase),p=>point(rm.point(p)),m.width*r.width,m.height*r.height);
   }
  }
 }
 visit(start,parentTime,ident,project.canvas.ratio,1);return {regions};
}
