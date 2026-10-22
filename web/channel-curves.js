export const CURVE_CHANNELS=['luminance','rgb','red','green','blue','alpha'];
export const identityCurve=()=>[[0,0],[1,1]];
export const curveDefaults=()=>({enabled:false,...Object.fromEntries(CURVE_CHANNELS.map(k=>[k,identityCurve()]))});
export function sanitizeCurves(raw){
 const result=curveDefaults();result.enabled=raw?.enabled===true;
 for(const key of CURVE_CHANNELS){
  const points=new Map();
  for(const p of Array.isArray(raw?.[key])?raw[key].slice(0,16):[]){if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))continue;points.set(Math.max(0,Math.min(1,p[0])),Math.max(0,Math.min(1,p[1])));}
  if(points.size){if(!points.has(0))points.set(0,0);if(!points.has(1))points.set(1,1);result[key]=[...points].sort((a,b)=>a[0]-b[0]).slice(0,15).concat([[1,points.get(1)]]).filter((p,i,a)=>!i||p[0]!==a[i-1][0]);}
 }
 return result;
}
export const hasChannelCurves=n=>n.curves?.enabled===true&&CURVE_CHANNELS.some(k=>(n.curves[k]??identityCurve()).some(([x,y])=>Math.abs(x-y)>1e-6));
// Shape-preserving cubic Hermite tangents. Flat sections and turning points
// get horizontal tangents so color/alpha adjustments cannot overshoot.
export function curveTangents(points){
 const n=points.length;if(n<2)return [0];
 const h=[],delta=[];for(let i=0;i<n-1;i++){h.push(Math.max(1e-12,points[i+1][0]-points[i][0]));delta.push((points[i+1][1]-points[i][1])/h[i]);}
 if(n===2)return [delta[0],delta[0]];
 const endpoint=(h0,h1,d0,d1)=>{const m=((2*h0+h1)*d0-h0*d1)/(h0+h1);return Math.sign(m)!==Math.sign(d0)?0:Math.sign(d0)!==Math.sign(d1)&&Math.abs(m)>Math.abs(3*d0)?3*d0:m;};
 const slopes=Array(n).fill(0);slopes[0]=endpoint(h[0],h[1],delta[0],delta[1]);slopes[n-1]=endpoint(h[n-2],h[n-3],delta[n-2],delta[n-3]);
 for(let i=1;i<n-1;i++)if(delta[i-1]*delta[i]>0){const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];slopes[i]=(w1+w2)/(w1/delta[i-1]+w2/delta[i]);}
 return slopes;
}
export function curveValue(points,x){
 x=Math.max(0,Math.min(1,x));const slopes=curveTangents(points);
 for(let i=1;i<points.length;i++)if(x<=points[i][0]){
  const [a,b]=[points[i-1],points[i]],h=b[0]-a[0],t=Math.max(0,Math.min(1,(x-a[0])/Math.max(1e-12,h))),t2=t*t,t3=t2*t;
  return Math.max(Math.min(a[1],b[1]),Math.min(Math.max(a[1],b[1]),(2*t3-3*t2+1)*a[1]+(t3-2*t2+t)*h*slopes[i-1]+(-2*t3+3*t2)*b[1]+(t3-t2)*h*slopes[i]));
 }
 return points.at(-1)[1];
}
// Uniform control points avoid an 8-bit LUT, keeping PNG16/EXR curve precision.
export function curveUniforms(raw){const c=sanitizeCurves(raw),data=new Float32Array(288),counts=new Int32Array(6);CURVE_CHANNELS.forEach((k,j)=>{counts[j]=c[k].some(([x,y])=>Math.abs(x-y)>1e-6)?c[k].length:0;const slopes=curveTangents(c[k]);c[k].forEach(([x,y],i)=>data.set([x,y,slopes[i]],j*48+i*3));});return {data,counts};}
export const CURVES_GLSL=`
uniform vec3 curvePoints[96];uniform int curveCounts[6];
float mapCurve(int ch,float x){if(curveCounts[ch]<2)return x;x=clamp(x,0.,1.);int start=ch*16;vec3 a=curvePoints[start];for(int i=1;i<16;i++){if(i>=curveCounts[ch])break;vec3 b=curvePoints[start+i];if(x<=b.x){float h=b.x-a.x,t=clamp((x-a.x)/max(1.e-12,h),0.,1.),t2=t*t,t3=t2*t;return clamp((2.*t3-3.*t2+1.)*a.y+(t3-2.*t2+t)*h*a.z+(-2.*t3+3.*t2)*b.y+(t3-t2)*h*b.z,min(a.y,b.y),max(a.y,b.y));}a=b;}return a.y;}
void channelCurves(inout vec4 c,inout float h){
 float oldAlpha=c.a;vec3 rgb=oldAlpha>.000001?c.rgb/oldAlpha:vec3(0);
 float l=dot(rgb,vec3(.2126,.7152,.0722)),mapped=mapCurve(0,l);rgb=l>.000001?rgb*(mapped/l):vec3(mapped);
 rgb=vec3(mapCurve(2,mapCurve(1,rgb.r)),mapCurve(3,mapCurve(1,rgb.g)),mapCurve(4,mapCurve(1,rgb.b)));
 float alpha=mapCurve(5,oldAlpha);c=vec4(rgb*alpha,alpha);
 h=mapCurve(0,oldAlpha>.000001?h/oldAlpha:0.)*alpha;
}
`;
