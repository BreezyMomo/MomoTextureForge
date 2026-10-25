import {bezierPoint} from './bezier-path.js';
import {ARRANGEMENT_LIMITS as LIMITS} from './arrangement-limits.js';
import { effectiveArrangement, ringCounts } from "./arrangement.js";
import {visibleScatter} from './scatter-footprints.js';
const TAU=Math.PI*2, DEG=Math.PI/180;
const clamp=(v)=>Math.max(0,Math.min(1,v));
const rotate=(x,y,a)=>[Math.cos(a)*x+Math.sin(a)*y,-Math.sin(a)*x+Math.cos(a)*y];
function random(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function cubicPoint(p,t){const q=1-t;return [0,1].map(k=>q*q*q*p[k]+3*q*q*t*p[k+2]+3*q*t*t*p[k+4]+t*t*t*p[k+6]);}
// Arc length lookup includes degenerate curves and reversed progress ranges.
function arcSamples(point,start,end,count,spacing=0){
 const table=[{p:point(start),distance:0,t:start}];
 for(let i=1;i<=256;i++){const t=start+(end-start)*i/256,p=point(t),last=table.at(-1);table.push({p,t,distance:last.distance+Math.hypot(p[0]-last.p[0],p[1]-last.p[1])});}
 const length=table.at(-1).distance;
 if(spacing>0) count=Math.min(LIMITS.instances,Math.floor(length/spacing)+1);
 if(length<1e-8)return [{x:table[0].p[0],y:table[0].p[1],angle:0,t:0}];
 let j=1;return Array.from({length:count},(_,i)=>{
  const distance=spacing>0?i*spacing:length*(count===1?.5:i/(count-1));
  while(j<table.length-1&&table[j].distance<distance)j++;
  const a=table[j-1],b=table[j],f=(distance-a.distance)/Math.max(1e-9,b.distance-a.distance);
  const t=a.t+(b.t-a.t)*f, p=point(t),prev=point(Math.max(0,t-.0001)),next=point(Math.min(1,t+.0001));
  return {x:p[0],y:p[1],angle:Math.atan2((next[1]-prev[1])*Math.sign(end-start),(next[0]-prev[0])*Math.sign(end-start)),t:count===1?0:i/(count-1)};
 });
}
export function densitySampler(pixels,size){
 // Renderer.read is top-to-bottom; position coordinates use bottom-to-top.
 const scale=pixels instanceof Uint8Array?1/255:1;
 return (x,y)=>{
  const ix=Math.min(size-1,Math.max(0,Math.floor((x+.5)*size)));
  const iy=Math.min(size-1,Math.max(0,Math.floor((.5-y)*size)));
  return clamp(pixels[(iy*size+ix)*4]*scale);
 };
}
export function generateArrangement(values,{seamless=false,density=()=>1,avoidOverlap=false,gap=0,wrap=seamless,footprint=null,aspect=1,fit='contain',bezier=[]}={}){
 const a=effectiveArrangement(values,seamless),mode=a[0],count=Math.min(a[3],mode===10?Math.floor(LIMITS.instances/(1+a[37])):LIMITS.instances),radius=a[5],rng=random(a[11]);
 // The original 16-slot radial/random ABI uses slot 7 for orientation and
 // independent seeded hashes for position, scale and rotation (arrangedAt).
 if(mode===2||mode===3){
  const fract=x=>x-Math.floor(x),hash=index=>{let x=fract(index*.1031),y=fract(a[11]*.11369);const d=x*(y+19.19)+y*(x+19.19);x+=d;y+=d;return fract(x*y*(x+y));},spin=a[6]*DEG;
  return Array.from({length:count},(_,i)=>{
   const angle=TAU*i/count*a[15],rnd=hash(i);
   let x=mode===2?Math.cos(angle)*radius:(rnd-.5)*2*radius,y=mode===2?Math.sin(angle)*radius:(hash(i+173)-.5)*2*radius;
   [x,y]=rotate(x+(hash(i+41)-.5)*a[8]*2*radius,y+(hash(i+89)-.5)*a[8]*2*radius,spin);x+=.5+a[13];y+=.5+a[14];
   if(seamless){x=fract(x);y=fract(y);}
   return {x,y,size:a[4]*(1-a[9]+2*a[9]*hash(i+233)),turn:spin+(mode===2&&a[7]>.5?Math.PI/2-angle:0)+(rnd*2-1)*a[10]*DEG,mirror:1};
  });
 }
 if([7,12].includes(mode)&&(footprint&&avoidOverlap||aspect!==1))return visibleScatter(a,{density,footprint:footprint??(()=>({x:0,y:0,radius:avoidOverlap?Math.SQRT1_2:0,empty:!avoidOverlap})),gap:avoidOverlap?gap:0,wrap:seamless||wrap,aspect,fit});
 let points=[];
 if(mode===6){const p=[...a.slice(20,28),...bezier].map(v=>v*radius);points=arcSamples(t=>bezierPoint(p,t),a[28],a[29],count,a[30]?a[31]:0);}
 if(mode===9)points=arcSamples(t=>{const angle=t*TAU*a[35],r=radius*(a[36]+(1-a[36])*t);return [Math.cos(angle)*r,Math.sin(angle)*r];},0,1,count);
 if(mode===8){const counts=ringCounts(a);for(let ring=0;ring<a[33];ring++)for(let i=0;i<counts[ring]&&points.length<LIMITS.instances;i++){
   const t=a[33]===1?1:ring/(a[33]-1),r=radius*(a[36]+(1-a[36])*t),angle=TAU*i/counts[ring]*a[15]+ring*a[34]*DEG;
   points.push({x:Math.cos(angle)*r,y:Math.sin(angle)*r,angle,t});
 }}
 if(mode===10){for(let i=0;i<count&&points.length<LIMITS.instances;i++)for(let side=0;side<=a[37]&&points.length<LIMITS.instances;side++){
   const angle=TAU*i/count+(side?-1:1)*a[34]*DEG;
   points.push({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,angle,t:0,mirror:!!side});
 }}
 if(mode===11){const cols=a[1],rows=a[2],step=2*radius/Math.max(cols-.5,(rows-1)*Math.sqrt(3)/2,1);
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   let x=(col+(row%2)*.5-(cols-1)/2-(rows>1?.25:0))*step,y=(row-(rows-1)/2)*step*Math.sqrt(3)/2;
   if(a[38])[x,y]=[y,x];points.push({x,y,angle:0,t:0});
  }
 }
 if(mode===7||mode===12){
  // Bounded dart throwing with a spatial grid. Failed candidates never reduce the minimum distance.
  const cos=Math.cos(a[6]*DEG),sin=Math.sin(a[6]*DEG);
  const padding=avoidOverlap?Math.max(0,Math.min(.5,Number(gap)||0)):0;
  const extent=t=>avoidOverlap?Math.min(1,a[4]*(1+(a[18]-1)*t)*(1+a[9]))/Math.SQRT2:0;
  const min=a[32],cell=Math.max(min,2*Math.max(extent(0),extent(1))+padding,1e-6)/Math.SQRT2,buckets=new Map(),key=(x,y)=>`${x},${y}`;
  const periodic=seamless||avoidOverlap&&wrap;
  const distance=(p,x,y)=>{let dx=p.x-x,dy=p.y-y;if(periodic){[dx,dy]=[cos*dx+sin*dy,-sin*dx+cos*dy];dx-=Math.round(dx);dy-=Math.round(dy);}return Math.hypot(dx,dy);};
  for(let attempt=0;attempt<count*128&&points.length<count;attempt++){
   const x=(rng()*2-1)*radius,y=(rng()*2-1)*radius;
   if(mode===12){const weight=density(x/(2*radius),y/(2*radius));if(weight<=a[40]||rng()>Math.pow(clamp((weight-a[40])/Math.max(1e-9,1-a[40])),a[41]))continue;}
   const t=Math.min(1,Math.hypot(x,y)/(radius*Math.SQRT2)),r=extent(t),gx=Math.floor(x/cell),gy=Math.floor(y/cell);let clear=true;
   if(avoidOverlap&&periodic&&2*r+padding>1)continue;
   const separated=p=>distance(p,x,y)>=Math.max(min,r+extent(p.t)+padding);
   if(min===0&&!avoidOverlap){clear=true;}
   else if(periodic){clear=points.every(separated);}
   else for(let ox=-2;ox<=2&&clear;ox++)for(let oy=-2;oy<=2&&clear;oy++)for(const p of buckets.get(key(gx+ox,gy+oy))??[])if(!separated(p)){clear=false;break;}
   if(!clear)continue;
   const p={x,y,angle:Math.atan2(y,x),t:Math.min(1,Math.hypot(x,y)/(radius*Math.SQRT2))};points.push(p);
   const k=key(gx,gy);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p);
  }
 }
 const spin=a[6]*DEG;
 return points.slice(0,LIMITS.instances).map(p=>{
  // Scatter layouts already satisfy their spacing rule: no position jitter afterwards.
  const jitter=[7,12].includes(mode)?0:a[8]*radius;
  let [x,y]=rotate(p.x+(rng()*2-1)*jitter,p.y+(rng()*2-1)*jitter,spin);
  x+=.5+a[13];y+=.5+a[14];
  if(seamless){x=((x%1)+1)%1;y=((y%1)+1)%1;}
  const size=a[4]*(1+(a[18]-1)*(mode===8&&a[33]===1?0:p.t))*(1+(rng()*2-1)*a[9]);
  const turn=spin+((a[19]||mode===10)?Math.PI/2-p.angle+(a[19]===2&&mode!==10?Math.PI/2:0):0)+(rng()*2-1)*a[10]*DEG;
  return {x,y,size,turn,mirror:p.mirror?-1:1};
 });
}
export const TABLE_ARRANGEMENT_GLSL=`
uniform highp sampler2D instanceTable;uniform int instanceCounts[6];
float tableArrangedAt(vec2 u,int row,highp sampler2D source){
 float result=0.;if(seamless==1)u=fract(u);
 for(int j=0;j<instanceCounts[row];j++){
  vec4 p=texelFetch(instanceTable,ivec2(j*2,row),0),extra=texelFetch(instanceTable,ivec2(j*2+1,row),0);
  vec2 delta=u-p.xy;if(seamless==1)delta=mod(delta+.5,1.)-.5;
  vec2 v=rot(delta,-p.w)/max(p.z,.0001);v.x*=extra.x;v+=.5;
  float edge=max(abs(v.x-.5),abs(v.y-.5));if(edge>=.5)continue;
  result=max(result,sourceBilinear(source,v)*(1.-smoothstep(.49,.5,edge)));
 }return result;
}`;
