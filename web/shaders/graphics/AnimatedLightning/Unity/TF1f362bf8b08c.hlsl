#ifndef MF_GLSL_MOD
#define MF_GLSL_MOD
#define mod(x,y) ((x)-(y)*floor((x)/(y)))
#define lessThan(x,y) ((x)<(y))
#define greaterThan(x,y) ((x)>(y))
#define lessThanEqual(x,y) ((x)<=(y))
#define greaterThanEqual(x,y) ((x)>=(y))
#define equal(x,y) ((x)==(y))
#define notEqual(x,y) ((x)!=(y))
#endif


static const float MF_PI=3.14159265359;static const float MF_TAU=6.28318530718;
struct MF_Value {float4 color;float height;};
MF_Value MF_zero(){MF_Value v;v.color=float4(0.,0.,0.,0.);v.height=0.;return v;}
float2 MF_rot(float2 q,float a){float c=cos(a),s=sin(a);return float2(c*q.x+s*q.y,-s*q.x+c*q.y);}
float2 MF_place(float2 p,float4 box,float4 axis,float aspect){p-=box.xy;p=MF_rot(p*float2(aspect,1.),axis.z);p/=max(box.zw*float2(aspect,1.),float2(.000001,.000001));p.x*=axis.w;return p+axis.xy;}
float4 MF_blend(float4 dst,float4 src,int mode){float a=src.a+dst.a*(1.-src.a);if(mode==0)return float4(src.rgb+dst.rgb*(1.-src.a),a);float3 d=dst.a>0.?dst.rgb/dst.a:float3(0.,0.,0.),s=src.a>0.?src.rgb/src.a:float3(0.,0.,0.);if(mode==10)return dst*src.a;if(mode==11)return dst*(1.-src.a);float3 b=mode==6?abs(d-s):mode==7?lerp(2.*d*s,1.-2.*(1.-d)*(1.-s),step(float3(.5,.5,.5),d)):mode==8?(1.-2.*s)*d*d+2.*s*d:mode==9?min(float3(1.,1.,1.),d/max(float3(.00001,.00001,.00001),1.-s)):mode==1?d+s:mode==2?max(d,s):mode==3?d*s:mode==4?max(d-s,0.):1.-(1.-d)*(1.-s);return float4((1.-src.a)*dst.rgb+(1.-dst.a)*src.rgb+src.a*dst.a*b,a);}
float MF_height(float d,float s,float a,int mode){if(mode==0)return s+d*(1.-a);if(mode==1)return d+s;if(mode==2)return max(d,s);if(mode==3)return lerp(d,d*(a>0.?s/a:0.),a);if(mode==4)return max(d-s,0.);if(mode==6)return abs(d-s);if(mode==7)return d<.5?2.*d*s:1.-2.*(1.-d)*(1.-s);if(mode==8)return (1.-2.*s)*d*d+2.*s*d;if(mode==9)return min(1.,d/max(.00001,1.-s));if(mode==10)return d*a;if(mode==11)return d*(1.-a);return 1.-(1.-d)*(1.-s);}

precise float MF_graphic1_motionHash(float3 p,float time){p=frac(p*.1031+_MF_1_seed*.001);p+=dot(p,p.yzx+33.33);return frac((p.x+p.y)*p.z);}
float MF_graphic1_motionNoise(float3 p,float time){float3 i=floor(p),f=frac(p);f=f*f*(3.-2.*f);return lerp(lerp(lerp(MF_graphic1_motionHash(i,time),MF_graphic1_motionHash(i+float3(1,0,0),time),f.x),lerp(MF_graphic1_motionHash(i+float3(0,1,0),time),MF_graphic1_motionHash(i+float3(1,1,0),time),f.x),f.y),lerp(lerp(MF_graphic1_motionHash(i+float3(0,0,1),time),MF_graphic1_motionHash(i+float3(1,0,1),time),f.x),lerp(MF_graphic1_motionHash(i+float3(0,1,1),time),MF_graphic1_motionHash(i+float3(1,1,1),time),f.x),f.y),f.z);}
float MF_graphic1_motionFbm(float3 p,float time){float sum=0.,a=.5;for(int i=0;i<5;i++){sum+=a*MF_graphic1_motionNoise(p,time);p=p*2.03+float3(7.1,3.7,5.2);a*=.5;}return sum;}
float MF_graphic1_boltCurve(float y,float t,float branch,float time){return .5+(MF_graphic1_motionFbm(float3(y*_MF_1_scale,branch*13.,t),time)-.48)*_MF_1_wander+sin(y*18.+t*3.+branch)*.025;}
float4 MF_graphic1_generate(float2 uv,float time){
 float t=time*_MF_1_speed,energy=0.;
 for(int i=0;i<6;i++){
  if(float(i)>_MF_1_branches)break;float b=float(i);
  float start=.25+b*.09;
  float shift=i==0?0.:(uv.y-start)*(mod(b,2.)<1.?1.:-1.)*.7;
  float d=abs(uv.x-MF_graphic1_boltCurve(uv.y,t,b*.08,time)-shift);
  float gate=i==0?1.:smoothstep(start,start+.04,uv.y)*(1.-smoothstep(.8,1.,uv.y));
  energy+=gate*(exp(-d/max(.0005,_MF_1_thickness))+exp(-d/max(.001,_MF_1_glow))*.18);
 }
 float flicker=.72+.28*sin(t*17.+_MF_1_seed);
 float a=clamp(energy*flicker*_MF_1_intensity,0.,1.)*smoothstep(0.,.03,uv.y)*(1.-smoothstep(.97,1.,uv.y));
 return float4(lerp(float3(.12,.35,1.),float3(.9,.97,1.),clamp(energy,0.,1.))*_MF_1_intensity,a);
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
