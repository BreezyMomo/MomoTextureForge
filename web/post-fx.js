// Radii are measured in pixels at a 512-pixel canvas, so exports scale consistently.
export const FX_SPECS=[
 ['模糊半径',0,32,0,.1],['Bloom 强度',0,3,0,.01],
 ['Bloom 半径',1,64,16,1],['Bloom 阈值',0,1,.6,.01],
 ['锐化强度',0,3,0,.01],['色散距离',0,24,0,.1],['卡通色阶',0,16,0,1]
];
export const fxDefaults=()=>FX_SPECS.map(s=>s[3]);
export const hasPostFx=n=>[0,1,4,5,6].some(i=>(n.postFx?.[i]??0)>0);
export const FX_GLSL=`
uniform float fxAmount,fxThreshold;
vec4 fxColor(vec2 p){if(repeatNode==1)p=fract(p);if(any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1))))return vec4(0);return filtered(srcColor,p);}
float fxHeight(vec2 p){if(repeatNode==1)p=fract(p);if(any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1))))return 0.;return filtered(srcHeight,p).r;}
void applyFx(out vec4 c,out float h){
 c=texture(srcColor,uv);h=texture(srcHeight,uv).r;
 if(operation==10){c=vec4(0);h=0.;float sum=0.;for(int i=-8;i<=8;i++){float x=float(i)/8.,weight=exp(-x*x*3.);vec2 q=uv+contourStep*x;c+=fxColor(q)*weight;h+=fxHeight(q)*weight;sum+=weight;}c/=sum;h/=sum;}
 if(operation==11){float v=max(max(c.r,c.g),c.b)/max(c.a,.00001),weight=max(0.,v-fxThreshold)/max(v,.00001);c*=weight;h*=weight;}
 if(operation==12){vec4 base=texture(dstColor,uv);float bh=texture(dstHeight,uv).r;float a=clamp(base.a+c.a*fxAmount*(1.-base.a),0.,1.);c=vec4(base.rgb+c.rgb*fxAmount,a);h=bh+c.a*fxAmount;}
 if(operation==13){vec2 d=1./vec2(textureSize(srcColor,0));vec4 b=(fxColor(uv+vec2(d.x,0))+fxColor(uv-vec2(d.x,0))+fxColor(uv+vec2(0,d.y))+fxColor(uv-vec2(0,d.y)))*.25;vec3 rgb=c.rgb/max(c.a,.00001),nearby=b.rgb/max(b.a,.00001);c.rgb=max(vec3(0),rgb+(rgb-nearby)*fxAmount)*c.a;float bh=(fxHeight(uv+vec2(d.x,0))+fxHeight(uv-vec2(d.x,0))+fxHeight(uv+vec2(0,d.y))+fxHeight(uv-vec2(0,d.y)))*.25;h=max(0.,h+(h-bh)*fxAmount);}
 if(operation==14){vec4 red=fxColor(uv+contourStep),blue=fxColor(uv-contourStep);float a=max(c.a,max(red.a,blue.a));c=vec4(red.r,c.g,blue.b,a);}
 if(operation==15){float levels=max(2.,floor(fxAmount));c.rgb=floor(clamp(c.rgb/max(c.a,.00001),0.,1.)*(levels-1.)+.5)/(levels-1.)*c.a;h=floor(clamp(h,0.,1.)*(levels-1.)+.5)/(levels-1.);}
}
`;
export function applyPostFx(renderer,source,node){
 if(!hasPostFx(node))return source;
 const fx=node.postFx??fxDefaults(),scale=Math.min(source.w,source.h)/512;let out=source;
 const pass=(src,op,options={})=>{const next=renderer.target(src.w,src.h,false,src.aspect);renderer.pass(next,{source:src,op,repeat:node.seamless,...options});return next;};
 const blur=(src,radius)=>{const x=pass(src,10,{contourStep:[radius*scale/src.w,0]}),y=pass(x,10,{contourStep:[0,radius*scale/src.h]});renderer.release(x);return y;};
 const replace=next=>{renderer.release(out);out=next;};
 if(fx[0]>0)replace(blur(out,fx[0]));
 if(fx[1]>0){const bright=pass(out,11,{fxThreshold:fx[3]}),soft=blur(bright,fx[2]);renderer.release(bright);const next=pass(soft,12,{dest:out,fxAmount:fx[1]});renderer.release(soft);replace(next);}
 if(fx[4]>0)replace(pass(out,13,{fxAmount:fx[4]}));
 if(fx[5]>0)replace(pass(out,14,{contourStep:[fx[5]*scale/out.w,0]}));
 if(fx[6]>0)replace(pass(out,15,{fxAmount:fx[6]}));
 return out;
}
