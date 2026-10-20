import {CONTOUR_LIMITS} from './pixel-contours.js';

// Piecewise-linear alpha is sampled at pixel centres. Triangulating each cell
// resolves diagonal contacts consistently and gives shared edges identical IDs.
export function coverageContours(pixels,width,height,threshold=.5,{maxEdges=CONTOUR_LIMITS.edges,maxVertices=CONTOUR_LIMITS.vertices}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels?.length!==width*height*4||!(threshold>0&&threshold<1))throw Error('亚像素轮廓采样参数无效');
 const stride=width+2,edges=new Map(),positions=new Map();let count=0;
 const value=(x,y)=>x<0||y<0||x>=width||y>=height?0:Math.max(0,Math.min(1,Number.isFinite(pixels[(y*width+x)*4+3])?pixels[(y*width+x)*4+3]:0));
 const vertex=(x,y)=>({id:(y+1)*stride+x+1,x:x+.5,y:y+.5,a:value(x,y)});
 function crossing(a,b){
  if(a.id>b.id)[a,b]=[b,a];const key=a.id+':'+b.id;
  if(!positions.has(key)){const t=Math.max(1e-9,Math.min(1-1e-9,(threshold-a.a)/(b.a-a.a)));positions.set(key,[Math.max(0,Math.min(width,a.x+(b.x-a.x)*t)),Math.max(0,Math.min(height,a.y+(b.y-a.y)*t))]);}
  return key;
 }
 function triangle(v){let from,to;for(let i=0;i<3;i++){const a=v[i],b=v[(i+1)%3],inside=a.a>threshold;if(inside===(b.a>threshold))continue;const key=crossing(a,b);if(inside)from=key;else to=key;}if(from!==undefined){if(++count>maxEdges)throw Error('亚像素轮廓过于复杂，请降低导出尺寸');edges.set(from,to);}}
 for(let y=-1;y<height;y++)for(let x=-1;x<width;x++){
  const a=vertex(x,y),b=vertex(x+1,y),c=vertex(x+1,y+1),d=vertex(x,y+1);
  // Choose the saddle diagonal from the centre coverage, keeping low-alpha
  // diagonal islands separate instead of always favouring one direction.
  const centre=(a.a+b.a+c.a+d.a)/4>threshold;
  if((a.a>threshold)===centre){triangle([a,b,c]);triangle([a,c,d]);}else{triangle([a,b,d]);triangle([b,c,d]);}
 }
 const loops=[];let vertices=0;
 while(edges.size){const seed=edges.keys().next().value,points=[];let key=seed,guard=0;do{points.push(positions.get(key));const next=edges.get(key);if(next===undefined||++guard>count)throw Error('亚像素轮廓未闭合');edges.delete(key);key=next;}while(key!==seed);
  const unique=points.filter((p,i)=>{const q=points[(i+points.length-1)%points.length];return Math.hypot(p[0]-q[0],p[1]-q[1])>1e-7;});
  const corners=unique.filter((p,i)=>{const a=unique[(i+unique.length-1)%unique.length],b=unique[(i+1)%unique.length];return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>1e-8;});
  if(corners.length<3)continue;vertices+=corners.length;if(vertices>maxVertices)throw Error('亚像素路径锚点过多，请降低导出尺寸');const area=corners.reduce((s,p,i)=>{const q=corners[(i+1)%corners.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;loops.push({points:corners,area});
 }
 loops.sort((a,b)=>Math.abs(b.area)-Math.abs(a.area));return {vertices,edges:count,paths:loops.map(l=>({open:false,operation:l.area>0?'combine':'subtract',fillRule:'even-odd',knots:l.points.map(p=>({linked:false,points:[...p,...p,...p]}))}))};
}
