import {smoothSketchPath} from './sketch-smoothing.js';
import {coverageContours} from './coverage-contours.js';
import {messageError} from './message-catalog.js';

const coverage=(pixels,i,source)=>{const at=i*4,value=source===1?pixels[at]*.2126+pixels[at+1]*.7152+pixels[at+2]*.0722:pixels[at+3];return Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;};
// Only the selected contour channel invalidates a trace; paint and seed do not.
export function createSketchContourTracer(){
 const cache=[];
 return (pixels,width,height,values={},geometry={})=>{
  const key=JSON.stringify([width,height,values.source??0,values.threshold??.5,values.simplify??2,values.smoothing??.5,geometry.aspect??1,geometry.bounds??[0,0,1,1]]);
  const index=cache.findIndex(entry=>entry.key===key&&entry.samples.length===pixels.length/4&&entry.samples.every((v,i)=>v===coverage(pixels,i,values.source)));
  if(index>=0){const entry=cache.splice(index,1)[0];cache.push(entry);return entry.outline;}
  const outline=sketchContours(pixels,width,height,{...values,...geometry}),samples=new Float64Array(pixels.length/4);
  for(let i=0;i<samples.length;i++)samples[i]=coverage(pixels,i,values.source);
  cache.push({key,samples,outline});if(cache.length>2)cache.shift();return outline;
 };
}

const distanceSquared=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;return (p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;};
// Iterative RDP and a farthest-point split preserve closed-loop corners and holes.
function simplifyOpen(points,tolerance){
 if(points.length<3)return points;const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack=[[0,points.length-1]],limit=tolerance*tolerance;
 while(stack.length){const [a,b]=stack.pop();let best=limit,index=-1;for(let i=a+1;i<b;i++){const d=distanceSquared(points[i],points[a],points[b]);if(d>best){best=d;index=i;}}if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}}
 return points.filter((_,i)=>keep[i]);
}
export function simplifySketchLoop(points,tolerance){
 if(points.length<4||tolerance<=0)return points;let far=1,best=0;for(let i=1;i<points.length;i++){const d=(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2;if(d>best){best=d;far=i;}}
 const a=simplifyOpen(points.slice(0,far+1),tolerance),b=simplifyOpen([...points.slice(far),points[0]],tolerance),result=[...a.slice(0,-1),...b.slice(0,-1)];return result.length>=3?result:points;
}
function loopPath(points){
 const point=p=>p.map(v=>Number(v.toFixed(3))).join(' '),at=i=>points[(i+points.length)%points.length];
 const smooth=i=>{const a=at(i-1),p=at(i),b=at(i+1),u=[p[0]-a[0],p[1]-a[1]],v=[b[0]-p[0],b[1]-p[1]],length=Math.hypot(...u)*Math.hypot(...v);return length>0&&(u[0]*v[0]+u[1]*v[1])/length>.86;};
 let path='M'+point(points[0]);for(let i=0;i<points.length;i++){const p=at(i),q=at(i+1);if(!smooth(i)&&!smooth(i+1)){path+='L'+point(q);continue;}const prev=at(i-1),next=at(i+2),a=p.map((v,k)=>v+(smooth(i)?(q[k]-prev[k])/6:(q[k]-v)/3)),b=q.map((v,k)=>v-(smooth(i+1)?(next[k]-p[k])/6:(v-p[k])/3));path+='C'+point(a)+' '+point(b)+' '+point(q);}return path+'Z';
}
export function sketchContours(pixels,width,height,{threshold=.5,simplify=2,smoothing=.5,source=0,aspect=1,bounds=[0,0,1,1]}={}){
 const samples=new Float32Array(width*height*4);for(let i=0;i<width*height;i++)samples[i*4+3]=coverage(pixels,i,source);
 let contours;try{contours=coverageContours(samples,width,height,threshold);}catch{throw messageError('fx.sketchComplexity');}
 const short=Math.min(aspect,1),baseWidth=512*aspect/short,baseHeight=512/short,[left,bottom,right,top]=bounds;let vertices=0;
 const loops=contours.paths.map(path=>{
  const points=path.knots.map(k=>[(left+k.points[0]/width*(right-left))*baseWidth,(1-bottom-k.points[1]/height*(top-bottom))*baseHeight]);
  const simplified=simplifySketchLoop(points,simplify);vertices+=simplified.length;return simplified;
 });
 if(vertices>12000||loops.length>512)throw messageError('fx.sketchComplexity');
 // Rounding only serializes subpixel coordinates; sampling/seed never depend on output dimensions.
 const path=loops.map(points=>smoothing>0?(smoothSketchPath(points,smoothing)??loopPath(points)):loopPath(points)).join('');
 return {path,loops,vertices,baseWidth,baseHeight};
}
