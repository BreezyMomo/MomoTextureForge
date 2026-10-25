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

float MF_graphic1_ref_smoothstep(float a,float b,float x);
float2 MF_graphic1_ref_smoothstep(float2 a,float2 b,float2 x);
float2 MF_graphic1_ref_smoothstep(float a,float b,float2 x);
float3 MF_graphic1_ref_smoothstep(float3 a,float3 b,float3 x);
float2 MF_graphic1_ref_rot2(float2 p, float a);
precise float MF_graphic1_ref_hash1(float2 p);
float2 MF_graphic1_ref_hash2(float2 p);
float2 MF_graphic1_ref_hash2s(float2 p);
float MF_graphic1_ref_perlin(float2 p);
float MF_graphic1_ref_fbmP(float2 p, int oct, float gain);
float MF_graphic1(float2 u,float4 a,float4 b,float4 c,float4 d,float time);
float MF_graphic1_ref_smoothstep(float a,float b,float x){if(a==b)return step(a,x);float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
float2 MF_graphic1_ref_smoothstep(float2 a,float2 b,float2 x){return float2(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y));}
float2 MF_graphic1_ref_smoothstep(float a,float b,float2 x){return MF_graphic1_ref_smoothstep(float2(a,a),float2(b,b),x);}
float3 MF_graphic1_ref_smoothstep(float3 a,float3 b,float3 x){return float3(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y),MF_graphic1_ref_smoothstep(a.z,b.z,x.z));}
float2 MF_graphic1_ref_rot2(float2 p, float a){
  float c = cos(a), s = sin(a);
  return mul(MF_mat2(c, s, -s, c),p);   // 列主序：此写法为逆时针旋转
}
precise float MF_graphic1_ref_hash1(float2 p){
  // Dave Hoskins hash12 —— 旧版在小整数格点上 (0,0)(1,0)(0,1)(1,1) 全部 < 0.5，
  // 会让「数量=2~4」的格子类图案整片空白
  float3 p3 = frac(float3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return frac((p3.x + p3.y) * p3.z);
}
float2 MF_graphic1_ref_hash2(float2 p){
  float n = MF_graphic1_ref_hash1(p);
  return float2(n, MF_graphic1_ref_hash1(p + n + 17.17));
}
float2 MF_graphic1_ref_hash2s(float2 p){ return MF_graphic1_ref_hash2(p) * 2.0 - 1.0; }
float MF_graphic1_ref_perlin(float2 p){
  float2 i = floor(p), f = frac(p);
  float2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(MF_graphic1_ref_hash2s(i + float2(0.0, 0.0)), f - float2(0.0, 0.0));
  float b = dot(MF_graphic1_ref_hash2s(i + float2(1.0, 0.0)), f - float2(1.0, 0.0));
  float c = dot(MF_graphic1_ref_hash2s(i + float2(0.0, 1.0)), f - float2(0.0, 1.0));
  float d = dot(MF_graphic1_ref_hash2s(i + float2(1.0, 1.0)), f - float2(1.0, 1.0));
  float v = lerp(lerp(a, b, u.x), lerp(c, d, u.x), u.y);
  return clamp(v * 0.7 + 0.5, 0.0, 1.0);
}
float MF_graphic1_ref_fbmP(float2 p, int oct, float gain){
  float v = 0.0, amp = 0.5, tot = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    v += amp * MF_graphic1_ref_perlin(p);
    tot += amp;
    p = p * 2.01 + float2(5.2, 1.3);
    amp *= gain;
  }
  return v / max(tot, 1e-4);
}
float MF_graphic1(float2 u,float4 a,float4 b,float4 c,float4 d,float time){float2 q=u*2.-1.;float r=length(q),angle=atan2(q.y,q.x);float R=a.x,W=a.y,N=a.z,S=a.w,D=b.x,K=b.y,H=b.z,T=time*b.w;{float2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float2 q = MF_graphic1_ref_rot2(uv - 0.5, refP1);
    q *= float2(max(refP0, 0.5), max(refP2, 0.02) * max(refP0, 0.5));
    float v = MF_graphic1_ref_fbmP(q, 4, 0.5);
    float root = lerp(1.0, MF_graphic1_ref_smoothstep(0.0, 1.0, uv.y), refP3);
    return clamp(v * lerp(0.3, 1.0, root) * 1.9, 0.0, 1.0);
}}
MF_Value MF_node1(float2 p,float aspect,float seconds){float4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;float2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float h=clamp(MF_graphic1(graphicUV,float4(_MF_1_scale,_MF_1_direction,_MF_1_stretch,_MF_1_rootGradient),float4(0.,0.,0.,0.),float4(0.,0.,0.,0.),float4(0.,0.,0.,0.),time),0.,1.);result.color=float4(lerp(float3(0.,0.,0.),float3(1.,1.,1.),h)*h,h);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(float2 p,float aspect,float seconds){float4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
float4 MF_Evaluate(float2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
