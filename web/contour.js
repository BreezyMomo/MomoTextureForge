// Four separable max/min filters approximate a circular kernel with an octagon.
// Each three-tap pass grows a contiguous interval; no sparse sampling at large radii.
export function contourPasses(radius,width,height){
 const r=Math.max(0,radius)*Math.min(width,height),passes=[];
 for(const [x,y,length]of [[1,0,r*(Math.SQRT2-1)],[0,1,r*(Math.SQRT2-1)],[1,1,r*(1-Math.SQRT1_2)],[1,-1,r*(1-Math.SQRT1_2)]]){
  let covered=0;while(length-covered>1e-7){const step=Math.min(covered*2+1,length-covered);passes.push([x*step/width,y*step/height]);covered+=step;}
 }return passes;
}
