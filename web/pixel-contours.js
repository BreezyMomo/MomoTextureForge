// Exact union of occupied pixel cells. This is tracing, not analytic geometry.
export const CONTOUR_LIMITS={edges:200000,vertices:50000};
export function pixelContours(region,width,height,{maxEdges=CONTOUR_LIMITS.edges,maxVertices=CONTOUR_LIMITS.vertices}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||region.length!==width*height)throw Error('轮廓采样尺寸不匹配');
 const stride=width+1,edges=new Map();let count=0;
 const filled=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&region[y*width+x]!==0;
 function edge(x,y,d){if(++count>maxEdges)throw Error('矢量轮廓过于复杂，请降低导出尺寸或提高透明度阈值');const key=y*stride+x;edges.set(key,(edges.get(key)??0)|(1<<d));}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(filled(x,y)){
  if(!filled(x,y-1))edge(x,y,0);if(!filled(x+1,y))edge(x+1,y,1);
  if(!filled(x,y+1))edge(x+1,y+1,2);if(!filled(x-1,y))edge(x,y+1,3);
 }
 const seeds=[...edges.keys()],loops=[];let vertices=0;
 for(const seed of seeds)while(edges.has(seed)){
  const points=[];let key=seed,incoming=-1,guard=0;
  do{
   const bits=edges.get(key);if(!bits)throw Error('轮廓未闭合');
   // Right turn first separates diagonally touching pixels into closed islands.
   const order=incoming<0?[0,1,2,3]:[(incoming+1)%4,incoming,(incoming+3)%4,(incoming+2)%4],d=order.find(d=>bits&(1<<d));
   points.push([key%stride,Math.floor(key/stride)]);const remaining=bits&~(1<<d);if(remaining)edges.set(key,remaining);else edges.delete(key);
   key+=[1,stride,-1,-stride][d];incoming=d;if(++guard>count)throw Error('轮廓追踪超出预算');
  }while(key!==seed);
  const corners=points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
  vertices+=corners.length;if(vertices>maxVertices)throw Error('矢量路径锚点过多，请降低导出尺寸或提高透明度阈值');
  const area=corners.reduce((sum,p,i)=>{const b=corners[(i+1)%corners.length];return sum+p[0]*b[1]-b[0]*p[1];},0)/2;
  if(corners.length>=3)loops.push({points:corners,area});
 }
 // Outer region, hole, then any island within that hole.
 loops.sort((a,b)=>Math.abs(b.area)-Math.abs(a.area));
 const paths=loops.map(loop=>({open:false,operation:loop.area>0?'combine':'subtract',fillRule:'even-odd',knots:loop.points.map(([x,y])=>({linked:false,points:[x,y,x,y,x,y]}))}));
 return {paths,vertices,edges:count};
}

export function occupiedPixels(pixels,width,height,threshold=0){
 if(pixels?.length!==width*height*4||!Number.isFinite(threshold)||threshold<0||threshold>=1)throw Error('轮廓透明度阈值须在 0～1 之间');
 const region=new Uint8Array(width*height);let occupied=0,best=-1,color={r:255,g:255,b:255};
 for(let i=0;i<region.length;i++){
  const alpha=pixels[i*4+3];if(!Number.isFinite(alpha)||alpha<=threshold)continue;
  region[i]=1;occupied++;if(alpha>best){best=alpha;const channel=k=>Math.round(Math.max(0,Math.min(1,Number.isFinite(pixels[i*4+k])?pixels[i*4+k]:0))*255);color={r:channel(0),g:channel(1),b:channel(2)};}
 }
 return {region,occupied,color};
}
