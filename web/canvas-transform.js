export const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
export function inversePoint(point,p){
 const o=point([0,0]),x=sub(point([1,0]),o),y=sub(point([0,1]),o),v=sub(p,o),det=x[0]*y[1]-x[1]*y[0];
 if(Math.abs(det)<1e-12)throw Error('节点区域为零，先在右侧调整宽高');return [(v[0]*y[1]-v[1]*y[0])/det,(x[0]*v[1]-x[1]*v[0])/det];
}
export function contains(region,p,padding=0){try{const q=inversePoint(region.point,p);return q.every(v=>v>=-padding&&v<=1+padding);}catch{return false;}}
export function moveTransform(region,delta){const t=region.transform,d=sub(inversePoint(region.parentPoint,add(region.pivot,delta)),inversePoint(region.parentPoint,region.pivot));return {x:t.x+d[0],y:t.y+d[1]};}
export function pivotTransform(region,p){
 const q=inversePoint(region.point,p).map(v=>Math.max(0,Math.min(1,v))),position=inversePoint(region.parentPoint,region.point(q));return {pivotX:q[0],pivotY:q[1],x:position[0],y:position[1]};
}
export function rotateTransform(region,start,p,snap=false){
 const t=region.transform,a=inversePoint(region.parentPoint,start),b=inversePoint(region.parentPoint,p);
 const w=region.parentWidth??1,h=region.parentHeight??1;
 let delta=(Math.atan2((b[1]-t.y)*h,(b[0]-t.x)*w)-Math.atan2((a[1]-t.y)*h,(a[0]-t.x)*w))*180/Math.PI;
 if(delta>180)delta-=360;if(delta< -180)delta+=360;const angle=t.rotation+delta;return {rotation:snap?Math.round(angle/15)*15:angle};
}
export function resizeTransform(region,start,p,handle,uniform=false){
 const t=region.transform,q0=inversePoint(region.point,start),q=inversePoint(region.point,p),dx=q[0]-q0[0],dy=q[1]-q0[1];
 const hx=handle[0],hy=handle[1];let fx=hx===.5?1:Math.max(.001,1+(hx===1?dx:-dx)),fy=hy===.5?1:Math.max(.001,1+(hy===1?dy:-dy));
 if(uniform||t.lockAspect||t.fit==='contain'){const f=hx===.5?fy:hy===.5?fx:Math.abs(fx-1)>Math.abs(fy-1)?fx:fy;fx=fy=Math.min(f,1/Math.max(t.width,t.height,1e-9));}
 // Keep the opposite handle fixed. Limits match the inspector and serializer.
 fx=Math.min(fx,1/Math.max(t.width,1e-9));fy=Math.min(fy,1/Math.max(t.height,1e-9));
 const anchor=[hx===.5?t.pivotX:1-hx,hy===.5?t.pivotY:1-hy],newPivot=[anchor[0]+(t.pivotX-anchor[0])*fx,anchor[1]+(t.pivotY-anchor[1])*fy];
 const pos=inversePoint(region.parentPoint,region.point(newPivot));return {width:t.width*fx,height:t.height*fy,x:pos[0],y:pos[1]};
}
export function bounds(regions){const points=regions.flatMap(r=>r.corners);return points.length?{min:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],max:[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}:null;}
export function snapMove(regions,delta,targets,tolerance){
 const b=bounds(regions);if(!b)return {delta,guides:[]};const result=[...delta],guides=[];
 for(let axis=0;axis<2;axis++){let best=tolerance[axis],line=null,offset=0;for(const value of [b.min[axis],(b.min[axis]+b.max[axis])/2,b.max[axis]])for(const target of targets[axis]){const d=target-value-delta[axis];if(Math.abs(d)<best){best=Math.abs(d);offset=d;line=target;}}result[axis]+=offset;if(line!==null)guides.push({axis,value:line});}return {delta:result,guides};
}
