import {boundsSize} from './render-bounds.js';
import {hasChannelCurves} from './channel-curves.js';
import {fxDefaults,POST_EFFECTS,effectOrder,effectEnabled,effectValues} from './post-effect-specs.js';
import {applySketchFx} from './sketch-fx.js';
export {FX_SPECS,fxDefaults} from './post-effect-specs.js';
// Radii are measured in pixels at a 512-pixel canvas, so exports scale consistently.
export const hasPostFx=n=>hasChannelCurves(n)||POST_EFFECTS.some(s=>effectEnabled(n,s.id));
export const FX_GLSL=`
uniform float fxAmount,fxThreshold;
uniform vec4 fxData[3],fxBounds;
uniform vec3 fxColors[3];
uniform vec2 fxMetric;
vec2 fxPosition(){return fxBounds.xy+uv*fxBounds.zw;}
vec2 fxTexture(vec2 p){return (p-fxBounds.xy)/fxBounds.zw;}
vec3 fxStraight(vec4 c){return c.a>.00001?c.rgb/c.a:vec3(0);}
float fxLuma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec4 fxColor(vec2 p){if(repeatNode==1)p=fract(p);if(any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1))))return vec4(0);return filtered(srcColor,p);}
float fxHeight(vec2 p){if(repeatNode==1)p=fract(p);if(any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1))))return 0.;return filtered(srcHeight,p).r;}
void applyFx(out vec4 c,out float h){
 c=texture(srcColor,uv);h=texture(srcHeight,uv).r;
 if(operation==10){c=vec4(0);h=0.;float sum=0.;for(int i=-8;i<=8;i++){float x=float(i)/8.,weight=exp(-x*x*3.);vec2 q=uv+contourStep*x;c+=fxColor(q)*weight;h+=fxHeight(q)*weight;sum+=weight;}c/=sum;h/=sum;}
 if(operation==11){float v=max(max(c.r,c.g),c.b)/max(c.a,.00001),weight=max(0.,v-fxThreshold)/max(v,.00001);c*=weight;h*=weight;}
 if(operation==12){vec4 base=texture(dstColor,uv);float bh=texture(dstHeight,uv).r;float a=clamp(base.a+c.a*fxAmount*(1.-base.a),0.,1.);c=vec4(base.rgb+c.rgb*fxAmount,a);h=bh+c.a*fxAmount;}
 if(operation==13){vec2 d=1./vec2(textureSize(srcColor,0));vec4 b=(fxColor(uv+vec2(d.x,0))+fxColor(uv-vec2(d.x,0))+fxColor(uv+vec2(0,d.y))+fxColor(uv-vec2(0,d.y)))*.25;vec3 rgb=c.rgb/max(c.a,.00001),nearby=b.rgb/max(b.a,.00001);c.rgb=max(vec3(0),rgb+(rgb-nearby)*fxAmount)*c.a;float bh=(fxHeight(uv+vec2(d.x,0))+fxHeight(uv-vec2(d.x,0))+fxHeight(uv+vec2(0,d.y))+fxHeight(uv-vec2(0,d.y)))*.25;h=max(0.,h+(h-bh)*fxAmount);}
 if(operation==14){vec2 d=contourStep;if(fxData[0].x>1.5){vec2 p=(fxPosition()-.5)*fxMetric;d=length(p)>.00001?normalize(p)*(contourStep.x*fxBounds.zw.x*fxMetric.x)/fxMetric/fxBounds.zw:vec2(0);}else if(fxData[0].x>.5)d=vec2(0,contourStep.y);else d.y=0.;vec4 red=fxColor(uv+d),blue=fxColor(uv-d);float a=max(c.a,max(red.a,blue.a));c=vec4(red.r,c.g,blue.b,a);}
 if(operation==15){float dark=max(2.,floor(fxAmount)),light=fxThreshold>0.?max(2.,floor(fxThreshold)):dark;vec3 rgb=clamp(fxStraight(c),0.,1.);float levels=floor(mix(dark,light,smoothstep(0.,1.,fxLuma(rgb)))+.5);c.rgb=floor(rgb*(levels-1.)+.5)/(levels-1.)*c.a;float hl=floor(mix(dark,light,smoothstep(0.,1.,clamp(h,0.,1.)))+.5);h=floor(clamp(h,0.,1.)*(hl-1.)+.5)/(hl-1.);}
 if(operation==20){vec2 stepSize=fxData[0].xy;vec2 p=(floor(fxPosition()/stepSize)+.5)*stepSize;vec2 q=fxTexture(p);c=fxColor(q);h=fxHeight(q);}
 if(operation==21){vec2 p=fxPosition();float w=max(.00001,fxData[0].y*.5),edge=0.;if(fxData[1].x>.5)edge=max(edge,1.-smoothstep(0.,w,1.-p.y));if(fxData[1].y>.5)edge=max(edge,1.-smoothstep(0.,w,p.y));if(fxData[1].z>.5)edge=max(edge,1.-smoothstep(0.,w,p.x));if(fxData[1].w>.5)edge=max(edge,1.-smoothstep(0.,w,1.-p.x));c.rgb=mix(fxStraight(c),fxColors[0],clamp(edge*fxData[0].x,0.,1.))*c.a;}
 if(operation==22){float wave=.5+.5*cos(6.28318530718*(fxPosition().y*fxData[0].x+fxData[0].y));c.rgb=mix(fxStraight(c),fxColors[0],wave*fxData[0].z)*c.a;}
 if(operation>=23&&operation<=25){vec2 p=fxPosition();if(operation==23){vec2 v=(p-.5)*fxMetric;float sector=6.28318530718/fxData[0].x,angle=atan(v.y,v.x)-radians(fxData[0].y);angle=abs(mod(angle,sector)-sector*.5);p=.5+length(v)*vec2(cos(angle),sin(angle))/fxMetric;}if(operation==24){if(fxData[0].x>.5)p.x=1.-abs(2.*fract(p.x)-1.);if(fxData[0].y>.5)p.y=1.-abs(2.*fract(p.y)-1.);}if(operation==25){vec2 v=(p-.5)*fxMetric;float fade=max(0.,1.-length(v)/fxData[0].y),a=fxData[0].x*fade*fade;v=mat2(cos(a),-sin(a),sin(a),cos(a))*v;p=.5+v/fxMetric;}vec2 q=fxTexture(p);c=fxColor(q);h=fxHeight(q);}
 if(operation==26){vec2 d=contourStep;float gx=0.,gy=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float value=fxLuma(fxStraight(fxColor(uv+vec2(x,y)*d)));gx+=value*float(x)*float(y==0?2:1);gy+=value*float(y)*float(x==0?2:1);}float edge=clamp(length(vec2(gx,gy))*fxAmount,0.,1.);c.rgb=mix(fxStraight(c),fxColors[0],edge)*c.a;}
 if(operation==27){float value=clamp(fxLuma(fxStraight(c)),0.,1.);c.rgb=(value<.5?mix(fxColors[0],fxColors[1],value*2.):mix(fxColors[1],fxColors[2],value*2.-1.))*c.a;}
 if(operation==28){float distance=length((fxPosition()-fxData[0].xy)*fxMetric),radius=fxData[0].z,feather=fxData[0].w;float mask=feather<=.00001?1.-step(radius,distance):1.-smoothstep(max(0.,radius-feather),radius,distance);if(fxData[1].x>.5)mask=1.-mask;c*=mask;h*=mask;}
 if(operation==29){vec3 rgb=fxStraight(c);float key=clamp(max(rgb.r,max(rgb.g,rgb.b)),0.,1.),a=mix(1.,key,fxAmount);c.rgb=rgb/max(a,.00001)*(c.a*a);c.a*=a;h*=a;}
 if(operation==30){vec2 d=contourStep;float left=fxHeight(uv-vec2(d.x,0)),right=fxHeight(uv+vec2(d.x,0)),bottom=fxHeight(uv-vec2(0,d.y)),top=fxHeight(uv+vec2(0,d.y));vec2 slope=vec2(left-right,bottom-top)*fxAmount;if(fxData[0].x>.5)slope.y=-slope.y;c.rgb=(normalize(vec3(slope,1.))*.5+.5)*c.a;}
 if(operation==31){vec4 ink=texture(tableTex,uv);if(fxData[0].x<.5){c=ink+c*(1.-ink.a);h=ink.a+h*(1.-ink.a);}else{c=ink;h=ink.a;}}
}
`;
export function applyPostFx(renderer,source,node){
 if(!hasPostFx(node))return source;
 const fx=node.postFx??fxDefaults(),[bw,bh]=boundsSize(source.bounds),scale=Math.min(source.w/bw,source.h/bh)/512;let out=source;
 const pass=(src,op,options={})=>{const next=renderer.target(src.w,src.h,false,src.aspect);renderer.pass(next,{source:src,op,repeat:(node.boundary==='repeat'),...options});return next;};
 const blur=(src,radius)=>{const x=pass(src,10,{contourStep:[radius*scale/src.w,0]}),y=pass(x,10,{contourStep:[0,radius*scale/src.h]});renderer.release(x);return y;};
 const replace=next=>{renderer.release(out);out=next;};
 const colors=(...values)=>values.flatMap(v=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16)/255));
 for(const id of effectOrder(node.effectOrder)){
  if(!effectEnabled(node,id))continue;const v=effectValues(node,id);
  if(id==='blur'&&fx[0]>0)replace(blur(out,fx[0]));
  if(id==='bloom'&&fx[1]>0){const bright=pass(out,11,{fxThreshold:fx[3]}),soft=blur(bright,fx[2]);renderer.release(bright);const next=pass(soft,12,{dest:out,fxAmount:fx[1]});renderer.release(soft);replace(next);}
  if(id==='sharpen'&&fx[4]>0)replace(pass(out,13,{fxAmount:fx[4]}));
  if(id==='chromatic'&&fx[5]>0)replace(pass(out,14,{contourStep:[fx[5]*scale/out.w,fx[5]*scale/out.h],fxData:[v.direction]}));
  if(id==='posterize'&&fx[6]>0)replace(pass(out,15,{fxAmount:fx[6],fxThreshold:v.lightSteps}));
  if(id==='pixelate')replace(pass(out,20,{fxData:[v.size/512*Math.min(source.aspect,1)/source.aspect,v.size/512*Math.min(source.aspect,1)]}));
  if(id==='vignette')replace(pass(out,21,{fxData:[v.strength,v.range,0,0,+v.top,+v.bottom,+v.left,+v.right],fxColors:colors(v.color)}));
  if(id==='scanline')replace(pass(out,22,{fxData:[v.density,(renderer.formulaSeconds??0)*v.speed+v.phase,v.strength],fxColors:colors(v.color)}));
  if(id==='kaleidoscope')replace(pass(out,23,{fxData:[v.segments,v.rotation]}));
  if(id==='mirror')replace(pass(out,24,{fxData:[+v.mirrorX,+v.mirrorY]}));
  if(id==='swirl')replace(pass(out,25,{fxData:[v.strength,v.radius]}));
  if(id==='edge')replace(pass(out,26,{contourStep:[v.width*scale/out.w,v.width*scale/out.h],fxAmount:v.strength,fxColors:colors(v.color)}));
  if(id==='tricolor')replace(pass(out,27,{fxColors:colors(v.shadow,v.midtone,v.highlight)}));
  if(id==='radialMask')replace(pass(out,28,{fxData:[v.centerX,v.centerY,v.radius,v.feather,+v.invert]}));
  if(id==='unblack')replace(pass(out,29,{fxAmount:v.strength}));
  if(id==='normal')replace(pass(out,30,{contourStep:[v.sampleStep*scale/out.w,v.sampleStep*scale/out.h],fxAmount:v.strength/v.sampleStep,fxData:[+v.flipY]}));
  if(id==='sketch')replace(applySketchFx(renderer,out,v));
 }
 return out;
}
