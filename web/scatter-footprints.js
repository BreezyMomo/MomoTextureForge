import {ARRANGEMENT_LIMITS as LIMITS} from './arrangement-limits.js';
// Fixed-resolution alpha geometry. Coordinates are normalized bottom-left UVs.
export function alphaFootprint(pixels,width,height,{threshold=1/255,margin=2}={}){
 const scale=pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray?1/255:1;
 let x0=width,y0=height,x1=-1,y1=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]*scale>threshold){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 if(x1<0)return {x:0,y:0,radius:0,empty:true};
 const cx=(x0+x1+1)/2/width,cy=(y0+y1+1)/2/height;let radius=0;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(pixels[(y*width+x)*4+3]*scale>threshold)radius=Math.max(radius,Math.hypot((x+.5)/width-cx,(y+.5)/height-cy));
 return {x:cx-.5,y:cy-.5,radius:radius+(margin+.5)*Math.hypot(1/width,1/height),empty:false};
}

// Each accepted index keeps its child choice while trying new positions. Size and
// angle belong to the accepted candidate, so collision and drawing agree exactly.
export function visibleScatter(a,{density=()=>1,footprint,gap=0,wrap=false,aspect=1,fit='contain'}){
 let seed=a[11]>>>0;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const metric=aspect>=1?[aspect,1]:[1,1/aspect];
 const points=[],circles=[],spin=a[6]*Math.PI/180,cos=Math.cos(spin),sin=Math.sin(spin),padding=Math.max(0,Math.min(.5,Number(gap)||0)),min=a[32],count=Math.min(LIMITS.instances,a[3]);
 for(let attempt=0;attempt<count*128&&points.length<count;attempt++){
  const px=(rng()*2-1)*a[5],py=(rng()*2-1)*a[5];
  if(a[0]===12){const w=density(px/(2*a[5]),py/(2*a[5]));if(w<=a[40]||rng()>Math.pow(Math.max(0,Math.min(1,(w-a[40])/Math.max(1e-9,1-a[40]))),a[41]))continue;}
  const t=Math.min(1,Math.hypot(px,py)/(a[5]*Math.SQRT2)),angle=Math.atan2(py,px);
  const size=a[4]*(1+(a[18]-1)*t)*(1+(rng()*2-1)*a[9]);
  const turn=spin+(a[19]?Math.PI/2-angle+(a[19]===2?Math.PI/2:0):0)+(rng()*2-1)*a[10]*Math.PI/180;
  const x=cos*px+sin*py+.5+a[13],y=-sin*px+cos*py+.5+a[14],f=footprint(points.length),s=Math.min(1,size),c=Math.cos(turn),sn=Math.sin(turn);
  const sx=s*(fit==='stretch'?metric[0]:1),sy=s*(fit==='stretch'?metric[1]:1),wx=x*metric[0],wy=y*metric[1];
  const circle={x:wx+c*f.x*sx+sn*f.y*sy,y:wy-sn*f.x*sx+c*f.y*sy,radius:Math.max(sx,sy)*f.radius,empty:f.empty,px:wx,py:wy};
  if(wrap&&!circle.empty&&2*circle.radius+padding>Math.min(...metric))continue;
  const distance=(x,y)=>{if(wrap){x-=Math.round(x/metric[0])*metric[0];y-=Math.round(y/metric[1])*metric[1];}return Math.hypot(x,y);};
  if(circles.some(p=>distance(wx-p.px,wy-p.py)<min||!circle.empty&&!p.empty&&distance(circle.x-p.x,circle.y-p.y)<circle.radius+p.radius+padding))continue;
  circles.push(circle);points.push({x,y,size,turn,mirror:1});
 }
 return points;
}
