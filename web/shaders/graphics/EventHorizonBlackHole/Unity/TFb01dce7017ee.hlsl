#ifndef MF_GLSL_MOD
#define MF_GLSL_MOD
#define mod(x,y) ((x)-(y)*floor((x)/(y)))
#define lessThan(x,y) ((x)<(y))
#define greaterThan(x,y) ((x)>(y))
#define lessThanEqual(x,y) ((x)<=(y))
#define greaterThanEqual(x,y) ((x)>=(y))
#define equal(x,y) ((x)==(y))
#define notEqual(x,y) ((x)!=(y))
float2x2 MF_mat2(float a,float b,float c,float d){return float2x2(a,c,b,d);}
float2x2 MF_mat2(float2 a,float2 b){return float2x2(a.x,b.x,a.y,b.y);}
float2x2 MF_mat2(float s){return float2x2(s,0.,0.,s);}
#endif


static const float MF_PI=3.14159265359;static const float MF_TAU=6.28318530718;
struct MF_Value {float4 color;float height;};
MF_Value MF_zero(){MF_Value v;v.color=float4(0.,0.,0.,0.);v.height=0.;return v;}
float2 MF_rot(float2 q,float a){float c=cos(a),s=sin(a);return float2(c*q.x+s*q.y,-s*q.x+c*q.y);}
float2 MF_place(float2 p,float4 box,float4 axis,float aspect){p-=box.xy;p=MF_rot(p*float2(aspect,1.),axis.z);p/=max(box.zw*float2(aspect,1.),float2(.000001,.000001));p.x*=axis.w;return p+axis.xy;}
float4 MF_blend(float4 dst,float4 src,int mode){float a=src.a+dst.a*(1.-src.a);if(mode==0)return float4(src.rgb+dst.rgb*(1.-src.a),a);float3 d=dst.a>0.?dst.rgb/dst.a:float3(0.,0.,0.),s=src.a>0.?src.rgb/src.a:float3(0.,0.,0.);if(mode==10)return dst*src.a;if(mode==11)return dst*(1.-src.a);float3 b=mode==6?abs(d-s):mode==7?lerp(2.*d*s,1.-2.*(1.-d)*(1.-s),step(float3(.5,.5,.5),d)):mode==8?(1.-2.*s)*d*d+2.*s*d:mode==9?min(float3(1.,1.,1.),d/max(float3(.00001,.00001,.00001),1.-s)):mode==1?d+s:mode==2?max(d,s):mode==3?d*s:mode==4?max(d-s,0.):1.-(1.-d)*(1.-s);return float4((1.-src.a)*dst.rgb+(1.-dst.a)*src.rgb+src.a*dst.a*b,a);}
float MF_height(float d,float s,float a,int mode){if(mode==0)return s+d*(1.-a);if(mode==1)return d+s;if(mode==2)return max(d,s);if(mode==3)return lerp(d,d*(a>0.?s/a:0.),a);if(mode==4)return max(d-s,0.);if(mode==6)return abs(d-s);if(mode==7)return d<.5?2.*d*s:1.-2.*(1.-d)*(1.-s);if(mode==8)return (1.-2.*s)*d*d+2.*s*d;if(mode==9)return min(1.,d/max(.00001,1.-s));if(mode==10)return d*a;if(mode==11)return d*(1.-a);return 1.-(1.-d)*(1.-s);}

precise float MF_graphic1_ehHash(float3 p,float time){p=frac(p*.1031);p+=dot(p,p.yzx+33.33);return frac((p.x+p.y)*p.z);}
float MF_graphic1_ehNoise(float3 p,float time){
 float3 i=floor(p),f=frac(p);f=f*f*(3.-2.*f);
 return lerp(lerp(lerp(MF_graphic1_ehHash(i,time),MF_graphic1_ehHash(i+float3(1,0,0),time),f.x),lerp(MF_graphic1_ehHash(i+float3(0,1,0),time),MF_graphic1_ehHash(i+float3(1,1,0),time),f.x),f.y),lerp(lerp(MF_graphic1_ehHash(i+float3(0,0,1),time),MF_graphic1_ehHash(i+float3(1,0,1),time),f.x),lerp(MF_graphic1_ehHash(i+float3(0,1,1),time),MF_graphic1_ehHash(i+float3(1,1,1),time),f.x),f.y),f.z);
}
float MF_graphic1_ehFbm(float3 p,float time){float v=0.,w=.5;for(int i=0;i<6;i++){v+=w*MF_graphic1_ehNoise(p,time);p=float3(-.80*p.y-.60*p.z,.80*p.x+.36*p.y-.48*p.z,.60*p.x-.48*p.y+.64*p.z)*2.03+float3(7.3,1.7,4.8);w*=.5;}return v;}
float2 MF_graphic1_ehRotate(float2 p,float a,float time){float c=cos(a),s=sin(a);return float2(c*p.x-s*p.y,s*p.x+c*p.y);}
float3 MF_graphic1_ehDiskEmission(float3 pos,float elapsed,float seedValue,float innerEdge,float outerEdge,float heat,float filamentDetail,float time){
 float radius=length(pos.xz),angle=atan2(pos.z,pos.x);
 float normalizedR=(radius-innerEdge)/max(outerEdge-innerEdge,.01);
 // Differential rotation gives shearing filaments rather than a rotating decal.
 float orbit=elapsed*1.9/pow(max(radius,.5),1.5);
 float3 flow=float3(radius*4.8,cos(angle-orbit)*2.,sin(angle-orbit)*2.+seedValue*.07);
 float turbulence=MF_graphic1_ehFbm(flow,time);
 float phase=angle-orbit;
 float3 thread=float3(radius*22.+turbulence*3.,cos(phase)*9.,sin(phase)*9.+seedValue*.13);
 float filament=MF_graphic1_ehFbm(thread,time);
 float fine=pow(clamp(filament*1.6,0.,1.),3.);
 float hot=MF_graphic1_ehFbm(flow*3.8+5.,time);
 float ripples=.5+.5*sin(radius*85.+turbulence*25.+hot*9.);
 float brightness=(.17+fine*2.2+hot*.35+ripples*.11)*exp(-normalizedR*1.7);
 brightness*=smoothstep(0.,.07,normalizedR)*(1.-smoothstep(.70,1.,normalizedR));
 float doppler=pow(clamp(1.+pos.x/max(radius,.01)*.43,.3,1.6),1.65);
 float temperature=clamp(.94-normalizedR*.88+(turbulence-.5)*.8+heat,0.,1.1);
 float3 plasma=lerp(float3(1.,.055,.008),float3(1.,.40,.055),smoothstep(0.,.60,temperature));
 plasma=lerp(plasma,float3(1.,.88,.55),smoothstep(.42,1.,temperature));
 plasma=lerp(plasma,float3(1.,.95,.83),smoothstep(.93,1.1,temperature));
 return plasma*brightness*doppler*filamentDetail;
}
float4 MF_graphic1_generate(float2 uv,float time){
 float2 p=MF_graphic1_ehRotate((uv-float2(_MF_1_centerX,_MF_1_centerY))*2./_MF_1_magnification,-_MF_1_diskTilt*.01745329252,time);
 float inclination=_MF_1_viewAngle*.01745329252;
 float3 origin=float3(0.,sin(inclination),cos(inclination))*8.5;
 float3 forward=normalize(-origin),right=float3(1,0,0),up=normalize(cross(right,forward));
 float focal=1.7;
 float3 velocity=normalize(forward*focal+right*p.x+up*p.y);
 float3 position=origin;
 float horizon=.66;
 float innerEdge=horizon*_MF_1_diskInner,outerEdge=4.65;
 float angularMomentum=length(cross(origin,velocity));
 float conserved=angularMomentum*angularMomentum;
 float3 emission=float3(0.,0.,0.);float transmittance=1.;
 float minimumRadius=100.,lastY=position.y;
 float elapsed=time*_MF_1_motionSpeed;
 bool captured=false;
 for(int i=0;i<150;i++){
  float radius=length(position);
  minimumRadius=min(minimumRadius,radius);
  if(radius<horizon*1.015){captured=true;break;}
  if(radius>16. && i>12)break;
  float stepLength=clamp(radius*.072,.035,.38);
  // Schwarzschild-inspired null-ray acceleration, spatial step in horizon units.
  float3 acceleration=-1.5*horizon*conserved*position/pow(max(radius,.3),5.);
  float3 nextPosition=position+velocity*stepLength+acceleration*(stepLength*stepLength*.5);
  float3 nextVelocity=velocity+acceleration*stepLength;
  if(position.y*nextPosition.y<0.){
   float crossing=position.y/(position.y-nextPosition.y);
   float3 diskPoint=lerp(position,nextPosition,crossing);
   float diskRadius=length(diskPoint.xz);
   if(diskRadius>innerEdge && diskRadius<outerEdge){
    float3 disk=MF_graphic1_ehDiskEmission(diskPoint,elapsed,_MF_1_seed,innerEdge,outerEdge,_MF_1_diskHeat,_MF_1_filamentStrength,time);
    float occupancy=smoothstep(innerEdge,innerEdge+.13,diskRadius)*(1.-smoothstep(outerEdge-.7,outerEdge,diskRadius));
    emission+=transmittance*disk*_MF_1_diskBrightness;
    transmittance*=1.-occupancy*.92;
   }
  }
  // A finite-thickness hot atmosphere softens only the disk, not the whole image.
  float radial=length(position.xz);
  float envelope=exp(-abs(position.y)/.12)*smoothstep(innerEdge,innerEdge+.4,radial)*(1.-smoothstep(outerEdge*.7,outerEdge,radial));
  emission+=transmittance*float3(1.,.16,.025)*envelope*stepLength*.17*_MF_1_diskBrightness;
  position=nextPosition;velocity=nextVelocity;
 }

 // Factor the original E + B*T into straight RGBA so native source-over
 // preserves both shadowing and emissive plasma: A=1-T; RGB=E/A.
 if(captured)transmittance=0.;
 emission=max(emission,float3(0.,0.,0.))*_MF_1_exposure;
 float peak=max(emission.r,max(emission.g,emission.b));
 float3 radiance=pow(emission/(1.+peak),float3(.85,.85,.85));
 transmittance*=smoothstep(2.5980762*horizon,4.5*horizon,angularMomentum);
 float critical=2.5980762*horizon;
 float photon=exp(-abs(angularMomentum-critical)/.014)*.22;
 radiance+=float3(1.,.32,.055)*photon*_MF_1_diskBrightness*.25;
 // A tiny floor represents emission in otherwise fully transparent space.
 // Native compositing supports RGB above 1 (verified); do not clamp RGB here.
 float coverage=max(1.-transmittance,.0001);
 return float4(radiance/coverage,coverage);
}
MF_Value MF_node1(float2 p,float aspect,float seconds){float4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;float2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float4 raw=MF_graphic1_generate(graphicUV,time);if(graphicUV.x<0.||graphicUV.y<0.||graphicUV.x>1.||graphicUV.y>1.)raw=float4(0.,0.,0.,0.);float h=clamp(dot(raw.rgb,float3(.2126,.7152,.0722))*raw.a,0.,1.);result.color=float4(raw.rgb*raw.a,raw.a);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(float2 p,float aspect,float seconds){float4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
float4 MF_Evaluate(float2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
