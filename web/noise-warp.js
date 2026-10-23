// Stateless displacement of the current composited node, not a noise overlay.
const number=(key,min,max,value,step=.01)=>({key,label:'fx.param.'+key,min,max,default:value,step});
const select=(key,options,value=0)=>({...number(key,0,options.length-1,value,1),options});
export const NOISE_WARP_SPEC={id:'noiseWarp',parameters:[
 select('warpMode',['heatHaze','waterRipples','energyWarp']),
 number('warpX',0,64,12,.5),number('warpY',0,64,4,.5),
 number('warpScale',8,256,64,1),number('warpDetail',1,5,3,1),
 number('motionAngle',-180,180,90,1),number('motionSpeed',0,128,24,.5),
 select('warpMotion',['continuousMotion','closedLoopMotion']),number('loopSeconds',.1,60,3,.1),
 number('seed',1,65535,1,1),number('mix',0,1,1)
]};
export const noiseWarpActive=v=>v.mix>0&&(v.warpX>0||v.warpY>0);
export function noiseWarpMotion(v,seconds=0){
 if(!noiseWarpActive(v)||!(v.motionSpeed>0))return [0,0];
 const t=Number.isFinite(seconds)?seconds:0,angle=v.motionAngle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 if(v.warpMotion!==1)return [c*v.motionSpeed*t,s*v.motionSpeed*t];
 // Reduce time first: exact periods reproduce offset zero and endpoint velocity.
 const period=v.loopSeconds,phase=((t%period)+period)%period/period*2*Math.PI,radius=v.motionSpeed*period/(2*Math.PI);
 const x=Math.sin(phase)*radius,y=(1-Math.cos(phase))*radius;
 return [c*x-s*y,s*x+c*y];
}
export const NOISE_WARP_GLSL=`
float warpHash(vec2 p){
 uvec2 q=uvec2(ivec2(p));uint x=q.x*1664525u+q.y*1013904223u+uint(fxData[2].x)*747796405u;
 x^=x>>16u;x*=2246822519u;x^=x>>13u;return float(x&16777215u)/16777216.;
}
float warpNoise(vec2 p,vec2 period){
 vec2 cell=floor(p),f=fract(p),a=cell,b=cell+1.;
 if(repeatNode==1){a=mod(a,period);b=mod(b,period);}
 f=f*f*f*(f*(f*6.-15.)+10.);
 return mix(mix(warpHash(a),warpHash(vec2(b.x,a.y)),f.x),mix(warpHash(vec2(a.x,b.y)),warpHash(b),f.x),f.y);
}
float warpFBM(vec2 p,vec2 period){
 float sum=0.,weight=.5,total=0.;
 for(int i=0;i<5;i++){if(i>=int(fxData[0].w))break;sum+=weight*warpNoise(p,period);total+=weight;p=p*2.+vec2(17,29);period*=2.;weight*=.5;}
 return sum/total;
}
vec2 warpField(vec2 position){
 vec2 stretch=fxData[0].z<.5?vec2(1.,.35):vec2(1.);
 vec2 cells=512.*fxMetric/fxData[1].z*stretch;
 if(repeatNode==1)cells=max(vec2(1),floor(cells+.5));
 vec2 q=(position-fxData[1].xy/(512.*fxMetric))*cells;
 if(repeatNode==1)q=mod(q,cells);
 vec2 d;
 if(fxData[0].z<.5)d=vec2(warpFBM(q,cells),warpFBM(q+vec2(43,11),cells))*2.-1.;
 else if(fxData[0].z<1.5){
  vec2 wave=vec2(warpFBM(q,cells),warpFBM(q+vec2(31,57),cells))-.5;
  d=vec2(sin(6.28318530718*(q.x+q.y+wave.x*.65)),sin(6.28318530718*(q.y-q.x+wave.y*.65)));
 }else{
  vec2 bend=vec2(warpFBM(q,cells),warpFBM(q+vec2(19,67),cells))*2.-1.;
  d=vec2(warpFBM(q+bend*1.4+vec2(7,23),cells),warpFBM(q+bend.yx*1.4+vec2(71,3),cells))*2.-1.;
 }
 return clamp(d,vec2(-1),vec2(1));
}
vec4 warpTap(sampler2D tex,ivec2 p){
 ivec2 size=textureSize(tex,0);
 if(repeatNode==1)p=ivec2(mod(vec2(p),vec2(size)));
 else if(any(lessThan(p,ivec2(0)))||any(greaterThanEqual(p,size)))return vec4(0);
 return texelFetch(tex,p,0);
}
vec4 warpSample(sampler2D tex,vec2 logical){
 if(repeatNode==1)logical=fract(logical);
 vec2 p=fxTexture(logical)*vec2(textureSize(tex,0))-.5;ivec2 i=ivec2(floor(p));vec2 f=fract(p);
 // Sample transparent border taps instead of stretching the last opaque texel.
 return mix(mix(warpTap(tex,i),warpTap(tex,i+ivec2(1,0)),f.x),mix(warpTap(tex,i+ivec2(0,1)),warpTap(tex,i+ivec2(1,1)),f.x),f.y);
}
void applyNoiseWarp(out vec4 c,out float h){
 vec2 position=fxPosition(),d=warpField(position)*fxData[0].xy*fxAmount/(512.*fxMetric),q=position+d;
 c=warpSample(srcColor,q);h=warpSample(srcHeight,q).r;
}
`;
