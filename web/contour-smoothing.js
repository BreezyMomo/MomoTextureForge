const bounds=points=>points.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
const distance2=(p,a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y||1)));return (p[0]-a[0]-t*x)**2+(p[1]-a[1]-t*y)**2;};
function simplifyOpen(points,tolerance){
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]],limit=tolerance*tolerance;
 while(stack.length){const [a,b]=stack.pop();let max=limit,index=-1;for(let i=a+1;i<b;i++){const d=distance2(points[i],points[a],points[b]);if(d>max){max=d;index=i;}}if(index>=0){keep.add(index);stack.push([a,index],[index,b]);}}
 return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}
const area=points=>points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
export function smoothContourPaths(paths,{tolerance=.75}={}){
 if(!Number.isFinite(tolerance)||tolerance<=0||tolerance>1)throw Error('轮廓平滑误差须在 0～1 像素之间');
 let changed=0,curves=0;
 const result=paths.map(path=>{
  const raw=path.knots.map(k=>k.points.slice(2,4)),box=bounds(raw);
  if(raw.length<8||Math.min(box[2]-box[0],box[3]-box[1])<3||Math.abs(area(raw))<=6)return path;
  let opposite=1,best=0;for(let i=1;i<raw.length;i++){const d=(raw[i][0]-raw[0][0])**2+(raw[i][1]-raw[0][1])**2;if(d>best){best=d;opposite=i;}}
  const a=simplifyOpen(raw.slice(0,opposite+1),tolerance),b=simplifyOpen([...raw.slice(opposite),raw[0]],tolerance),points=[...a.slice(0,-1),...b.slice(0,-1)];
  if(points.length<3||area(points)*area(raw)<=0)return path;
  const knots=points.map((p,i)=>{
   const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],u=[p[0]-prev[0],p[1]-prev[1]],v=[next[0]-p[0],next[1]-p[1]],lu=Math.hypot(...u),lv=Math.hypot(...v),turn=Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(lu*lv||1))));
   // Keep prominent corners; small changes of direction get a continuous tangent.
   if(turn>=Math.PI/3)return {linked:false,points:[...p,...p,...p]};
   const t=[(next[0]-prev[0])/6,(next[1]-prev[1])/6],length=Math.hypot(...t),scale=Math.min(1,Math.min(lu,lv)/(3*(length||1)));t[0]*=scale;t[1]*=scale;curves++;
   return {linked:true,points:[p[0]-t[0],p[1]-t[1],...p,p[0]+t[0],p[1]+t[1]]};
  });
  changed++;return {...path,knots};
 });
 return {paths:result,changed,curves,vertices:result.reduce((sum,p)=>sum+p.knots.length,0)};
}

export function rasterizeContourPaths(paths,width,height,color){
 const canvas=typeof document==='undefined'?new OffscreenCanvas(width,height):document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('无法创建矢量抗锯齿缓存');
 const outline=new Path2D();
 for(const path of paths){const knots=path.knots;if(!knots.length)continue;outline.moveTo(knots[0].points[2],knots[0].points[3]);for(let i=1;i<=knots.length;i++){const a=knots[i-1].points,b=knots[i%knots.length].points;outline.bezierCurveTo(a[4],a[5],b[0],b[1],b[2],b[3]);}outline.closePath();}
 ctx.fillStyle=`rgb(${color.r},${color.g},${color.b})`;ctx.fill(outline,'evenodd');const imageData=ctx.getImageData(0,0,width,height);canvas.width=canvas.height=1;return imageData;
}

export function preservesContourInterior(region,imageData,width,height,reference){
 const data=imageData.data;if(imageData.width!==width||imageData.height!==height||data.length!==region.length*4)return false;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,alpha=data[i*4+3];if(reference&&Math.abs(alpha-reference.data[i*4+3])<=3)continue;if(alpha===(region[i]?255:0))continue;
  let boundary=false;for(let dy=-1;dy<=1&&!boundary;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,v=xx>=0&&yy>=0&&xx<width&&yy<height?region[yy*width+xx]:0;if(v!==region[i]){boundary=true;break;}}
  if(!boundary)return false;
 }return true;
}

export function fitContourPathsIndividually(paths,rasterize,validate,{tolerance=.75}={}){
 let accepted=0,preserved=0;
 const fitted=paths.map(path=>{
  const candidate=smoothContourPaths([path],{tolerance});if(!candidate.changed)return path;
  const points=path.knots.map(k=>k.points.slice(2,4)),box=bounds(points),left=Math.floor(box[0])-2,top=Math.floor(box[1])-2,width=Math.ceil(box[2])-left+2,height=Math.ceil(box[3])-top+2;
  const move=p=>({...p,operation:'combine',knots:p.knots.map(k=>({...k,points:k.points.map((v,i)=>v-(i%2?top:left))}))});
  const raw=rasterize([move(path)],width,height,{r:255,g:255,b:255});
  const straight=p=>({...p,knots:p.knots.map(k=>({linked:false,points:[k.points[2],k.points[3],k.points[2],k.points[3],k.points[2],k.points[3]]}))});
  // Angular shapes can reject the curved tangent but still safely lose the
  // pixel staircase. Try a polygon and then a tighter polygon before fallback.
  const trials=[candidate.paths[0],straight(candidate.paths[0]),straight(smoothContourPaths([path],{tolerance:Math.min(tolerance,.35)}).paths[0]),straight(smoothContourPaths([path],{tolerance:Math.min(tolerance,.1)}).paths[0]),straight(smoothContourPaths([path],{tolerance:Math.min(tolerance,.025)}).paths[0])];
  for(const trial of trials){const next=rasterize([move(trial)],width,height,{r:255,g:255,b:255});if(validate(raw,next,width,height)){accepted++;return trial;}}
  preserved++;return path;
 });
 return {paths:fitted,accepted,preserved,vertices:fitted.reduce((n,p)=>n+p.knots.length,0)};
}
