// Bounded, deterministic cubic fitting of an already traced pixel boundary.
// No raster validation, geometry union, random state or export-size dependence.
const unit=v=>{const n=Math.hypot(...v);return n?v.map(x=>x/n):[1,0];};
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const cubicPoint=(c,t)=>c[0].map((_,k)=>(1-t)**3*c[0][k]+3*(1-t)**2*t*c[1][k]+3*(1-t)*t*t*c[2][k]+t**3*c[3][k]);

function fitSpan(points,first,last,start,end){
 const a=points[first],b=points[last],u=[0];let length=0;
 for(let i=first+1;i<=last;i++){length+=distance(points[i],points[i-1]);u.push(length);}
 let c00=0,c01=0,c11=0,x0=0,x1=0;
 for(let i=0;i<u.length;i++){
  const t=length?u[i]/length:0;u[i]=t;const v=1-t,b0=v**3,b1=3*t*v*v,b2=3*t*t*v,b3=t**3;
  const p=start.map(x=>x*b1),q=end.map(x=>x*b2),r=points[first+i].map((x,k)=>x-a[k]*(b0+b1)-b[k]*(b2+b3));
  c00+=dot(p,p);c01+=dot(p,q);c11+=dot(q,q);x0+=dot(p,r);x1+=dot(q,r);
 }
 const det=c00*c11-c01*c01,chord=distance(a,b);let alpha=det>1e-12?(x0*c11-x1*c01)/det:0,beta=det>1e-12?(x1*c00-x0*c01)/det:0;
 if(alpha<chord*1e-4||beta<chord*1e-4||alpha>length||beta>length)alpha=beta=chord/3;
 const curve=[a,a.map((x,k)=>x+start[k]*alpha),b.map((x,k)=>x+end[k]*beta),b];let error=0,split=(first+last)>>1;
 for(let i=first+1;i<last;i++){const v=sub(cubicPoint(curve,u[i-first]),points[i]),d=dot(v,v);if(d>error){error=d;split=i;}}
 return {curve,error,split};
}

export function fitSketchLoop(points,amount){
 const n=points.length;if(n<5)return null;
 const tolerance=.5+Math.max(0,Math.min(1,amount))*4,window=3+tolerance*2,arc=[0];
 for(let i=1;i<=n;i++)arc.push(arc.at(-1)+distance(points[i%n],points[i-1]));
 const total=arc[n];if(total<1e-6)return null;
 const at=i=>points[(i+n)%n],turns=new Float64Array(n),candidates=[],neighbours=[];
 // A distance window sees actual corners, rather than each pixel stair step.
 for(let i=0;i<n;i++){
  let before=i,after=i,walk=0,count=0;while(walk<window&&count++<Math.min(32,n/2)){walk+=distance(at(before),at(before-1));before--;}
  walk=0;count=0;while(walk<window&&count++<Math.min(32,n/2)){walk+=distance(at(after),at(after+1));after++;}
  neighbours.push([before,after]);
  turns[i]=Math.acos(Math.max(-1,Math.min(1,dot(unit(sub(points[i],at(before))),unit(sub(at(after),points[i]))))));
  if(turns[i]>=Math.PI/3)candidates.push(i);
 }
 const corners=[],blocked=new Uint8Array(n);
 for(const i of candidates.sort((a,b)=>turns[b]-turns[a]||a-b)){
  if(blocked[i])continue;corners.push(i);blocked[i]=1;
  for(const direction of [-1,1]){let walk=0,at=i;for(let k=0;k<32;k++){const next=(at+direction+n)%n;walk+=distance(points[at],points[next]);if(walk>=window)break;blocked[next]=1;at=next;}}
 }
 // Split a smooth closed loop into two arcs with matching seam tangents.
 if(corners.length<2){if(!corners.length)corners.push(0);const first=corners[0];let far=first,best=0;for(let i=0;i<n;i++){const d=distance(points[first],points[i]);if(d>best){best=d;far=i;}}corners.push(far);}
 corners.sort((a,b)=>a-b);const actual=new Set(corners.filter(i=>turns[i]>=Math.PI/3)),curves=[];
 for(let part=0;part<corners.length;part++){
  const first=corners[part],last=corners[(part+1)%corners.length],span=[];for(let i=first;;i=(i+1)%n){span.push(points[i]);if(i===last)break;}
  const start=unit(sub(at(neighbours[first][1]),actual.has(first)?at(first):at(neighbours[first][0]))),end=unit(sub(at(neighbours[last][0]),actual.has(last)?at(last):at(neighbours[last][1])));
  const stack=[{first:0,last:span.length-1,start,end,depth:0}];
  while(stack.length){
   const item=stack.pop(),fitted=fitSpan(span,item.first,item.last,item.start,item.end);
   if(fitted.error<=tolerance*tolerance||item.last-item.first<=1){curves.push(fitted.curve);continue;}
   if(item.depth>=12){for(let i=item.first;i<item.last;i++){const a=span[i],b=span[i+1];curves.push([a,a.map((x,k)=>x+(b[k]-x)/3),b.map((x,k)=>x+(a[k]-x)/3),b]);}continue;}
   const i=fitted.split,j=(first+i)%n,tangent=unit(sub(at(neighbours[j][0]),at(neighbours[j][1])));
   stack.push({first:i,last:item.last,start:tangent.map(x=>-x),end:item.end,depth:item.depth+1},{first:item.first,last:i,start:item.start,end:tangent,depth:item.depth+1});
  }
 }
 return curves;
}

export function smoothSketchPath(points,amount){
 const curves=fitSketchLoop(points,amount);if(!curves)return null;
 const point=p=>p.map(v=>Number(v.toFixed(3))).join(' ');
 return 'M'+point(curves[0][0])+curves.map(c=>'C'+c.slice(1).map(point).join(' ')).join('')+'Z';
}
