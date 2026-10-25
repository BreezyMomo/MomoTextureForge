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

float MF_graphic1_ref_smoothstep(float a,float b,float x);
float2 MF_graphic1_ref_smoothstep(float2 a,float2 b,float2 x);
float2 MF_graphic1_ref_smoothstep(float a,float b,float2 x);
float3 MF_graphic1_ref_smoothstep(float3 a,float3 b,float3 x);
float MF_graphic1_ref_strokeD(float d, float w, float soft);
float MF_graphic1_ref_sdSeg(float2 p, float2 a, float2 b);
float MF_graphic1(float2 u,float4 a,float4 b,float4 c,float4 d,float time);
float MF_graphic1_ref_smoothstep(float a,float b,float x){if(a==b)return step(a,x);float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
float2 MF_graphic1_ref_smoothstep(float2 a,float2 b,float2 x){return float2(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y));}
float2 MF_graphic1_ref_smoothstep(float a,float b,float2 x){return MF_graphic1_ref_smoothstep(float2(a,a),float2(b,b),x);}
float3 MF_graphic1_ref_smoothstep(float3 a,float3 b,float3 x){return float3(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y),MF_graphic1_ref_smoothstep(a.z,b.z,x.z));}
float MF_graphic1_ref_strokeD(float d, float w, float soft){
  // 带状描边：|d| < w 内为 1，向外按 soft 羽化（旧实现误作向内填充，
  // 会导致 HUD 框线内部残留 0.5 灰底、Truchet 线条发灰）
  float hw = max(w, 0.0008);
  float so = max(soft, 0.0006);
  return 1.0 - MF_graphic1_ref_smoothstep(hw - so, hw + so, abs(d));
}
float MF_graphic1_ref_sdSeg(float2 p, float2 a, float2 b){
  float2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
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

    // 羽毛：一根中轴 + 两侧周期性斜向羽枝（用有限长线段 MF_graphic1_ref_sdSeg 画，
    // 长度 / 角度连续可调 → 比用条纹裁剪更好控制观感）。
    float n = floor(max(refP0, 4.0));
    float len = max(refP1, 0.08);
    float sw = max(refP2, 0.0015);
    float sway = max(refP3, 0.0);
    float w = max(refP4, 0.0012);
    float v = MF_graphic1_ref_strokeD(p.x, sw, sw * 1.6);                 // 中轴
    for(int i = 0; i < 16; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      float y0 = -0.92 + (fi + 0.5) * (1.84 / max(n, 1.0));
      float ph = sin(fi * 1.37) * sway * 0.20;
      // 羽枝越靠近两端越短（真实羽毛的轮廓）
      float leni = len * (0.55 + 0.45 * sin((fi + 0.5) / max(n, 1.0) * 3.14159265359));
      v = max(v, MF_graphic1_ref_strokeD(MF_graphic1_ref_sdSeg(p, float2(0.0, y0), float2( leni, y0 + leni * 0.52 + ph)), w, w * 0.7));
      v = max(v, MF_graphic1_ref_strokeD(MF_graphic1_ref_sdSeg(p, float2(0.0, y0), float2(-leni, y0 + leni * 0.52 - ph)), w, w * 0.7));
    }
    return clamp(v, 0.0, 1.0);
}}
MF_Value MF_node1(float2 p,float aspect,float seconds){float4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;float2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float h=clamp(MF_graphic1(graphicUV,float4(_MF_1_barbPairs,_MF_1_barbLength,_MF_1_shaftWidth,_MF_1_swayAmplitude),float4(_MF_1_barbLineWidth,0.,0.,0.),float4(0.,0.,0.,0.),float4(0.,0.,0.,0.),time),0.,1.);result.color=float4(lerp(float3(0.,0.,0.),float3(1.,1.,1.),h)*h,h);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(float2 p,float aspect,float seconds){float4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
float4 MF_Evaluate(float2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
