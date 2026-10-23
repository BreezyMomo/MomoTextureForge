import {effectEnabled,effectValues} from './post-effect-specs.js';
// Logical rectangles are [left,bottom,right,top]. Texture margins never alter layout.
export const UNIT_BOUNDS=Object.freeze([0,0,1,1]);
export const boundsSize=b=>[b[2]-b[0],b[3]-b[1]];
export const unitBounds=b=>!b||b.every((v,i)=>v===UNIT_BOUNDS[i]);
export const unionBounds=(...boxes)=>[Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];
export const expandBounds=(b,x,y=x)=>[b[0]-x,b[1]-y,b[2]+x,b[3]+y];
export function intersectBounds(a,b){const c=[Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.min(a[2],b[2]),Math.min(a[3],b[3])];return c[2]>c[0]&&c[3]>c[1]?c:null;}
export const neededBounds=(b,need)=>unionBounds(UNIT_BOUNDS,intersectBounds(b,need)??UNIT_BOUNDS);
export function boundedPlacement(box,axis,source=UNIT_BOUNDS,target=UNIT_BOUNDS){
 const [sw,sh]=boundsSize(source),[tw,th]=boundsSize(target);
 return {box:[(box[0]-target[0])/tw,(box[1]-target[1])/th,box[2]*sw/tw,box[3]*sh/th],axis:[(axis[0]-source[0])/sw,(axis[1]-source[1])/sh,axis[2],axis[3]]};
}
export function transformBounds(rect,box,axis=[.5,.5,0,1],aspect=1,inverse=false){
 const c=Math.cos(axis[2]),s=Math.sin(axis[2]),points=[rect[0],rect[2]].flatMap(x=>[rect[1],rect[3]].map(y=>{
  if(inverse){const dx=(x-box[0])*aspect,dy=y-box[1];return [(c*dx+s*dy)/Math.max(box[2]*aspect,1e-9)*axis[3]+axis[0],(-s*dx+c*dy)/Math.max(box[3],1e-9)+axis[1]];}
  const dx=(x-axis[0])*box[2]*axis[3],dy=(y-axis[1])*box[3];return [box[0]+c*dx-s*dy/aspect,box[1]+s*dx*aspect+c*dy];
 }));
 return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
export function recordPlacement(r){return {box:[r.x,r.y,r.width,r.height],axis:[.5,.5,r.turn,r.mirror??1]};}
export function transformPlacement(t,aspect=1){let w=t.width,h=t.height;if(t.fit==='contain'){const side=Math.min(w*aspect,h);w=side/aspect;h=side;}return {box:[t.x,t.y,w,h],axis:[t.pivotX,t.pivotY,t.rotation*Math.PI/180,t.mirrorX?-1:1]};}
export function effectMargins(n,aspect=1){
 const fx=n.postFx??[],sketch=effectEnabled(n,'sketch')?effectValues(n,'sketch'):null,radius=(effectEnabled(n,'blur')?fx[0]??0:0)+(effectEnabled(n,'bloom')?fx[2]??16:0)+(effectEnabled(n,'chromatic')?fx[5]??0:0)+(sketch?sketch.strokeWidth*2+sketch.roughness*Math.max(4,sketch.maxRandomnessOffset*(1.5+.5*sketch.bowing)):0),contour=['outline','dilate'].includes(n.contour?.mode)?n.contour.radius:0;
 const moving=id=>effectEnabled(n,id)&&effectValues(n,id).mix>0;
 const extra=(moving('glitch')?effectValues(n,'glitch').displacement+effectValues(n,'glitch').rgbOffset:0)+(moving('zoomBlur')?effectValues(n,'zoomBlur').blurDistance:0);
 const short=Math.min(aspect,1),amount=(radius+extra)/512+(contour??0);
 const warp=moving('noiseWarp')?effectValues(n,'noiseWarp'):null;
 return [(amount+(warp?warp.warpX*warp.mix/512:0))*short/aspect,(amount+(warp?warp.warpY*warp.mix/512:0))*short];
}

export function periodicCopies(box,axis,source=UNIT_BOUNDS,aspect=1,limit=4096){
 const b=transformBounds(source,box,axis,aspect),x0=Math.floor(-b[2]+1e-9)+1,x1=Math.ceil(1-b[0]-1e-9)-1,y0=Math.floor(-b[3]+1e-9)+1,y1=Math.ceil(1-b[1]-1e-9)-1;
 const count=Math.max(0,x1-x0+1)*Math.max(0,y1-y0+1);if(!Number.isFinite(count)||count>limit)throw Error('无缝重复副本超过渲染预算，请缩小内容范围或减少排列数量');
 const copies=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)copies.push([box[0]+x,box[1]+y,box[2],box[3]]);return copies;
}
