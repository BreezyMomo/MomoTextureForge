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

precise float MF_graphic1_ref_hash1(float2 p);
float MF_graphic1(float2 u,float4 a,float4 b,float4 c,float4 d,float time);
precise float MF_graphic1_ref_hash1(float2 p){
  // Dave Hoskins hash12 —— 旧版在小整数格点上 (0,0)(1,0)(0,1)(1,1) 全部 < 0.5，
  // 会让「数量=2~4」的格子类图案整片空白
  float3 p3 = frac(float3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return frac((p3.x + p3.y) * p3.z);
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

    // 像素排序（glitch）观感：部分竖列被随机上下拉伸错位，错位边界是硬边。
    float cols = floor(max(refP1, 4.0));
    float ci = floor((p.x * 0.5 + 0.5) * cols);
    float h  = MF_graphic1_ref_hash1(float2(ci, 1.31));
    float on = step(max(refP2, 0.0), h);
    float off = (MF_graphic1_ref_hash1(float2(ci, 7.13)) - 0.5) * 2.0 * max(refP0, 0.0);
    float2 q = float2(p.x, p.y + off * on);
    // 底图用「分块随机亮度」（数据块），不用 fbm 云：ref_fbmP 的分布整体偏亮
    // （实测 base 均值 ≈ 0.83），一阈值化几乎全变白；分块随机天然居中，
    // 二值化后黑白均衡，也更贴近「像素排序故障」的数据块观感。
    float dens = max(refP4, 0.5) * 1.6;
    float lv = MF_graphic1_ref_hash1(floor(q * dens) + float2(3.7, 9.1));
    float base = 0.22 + 0.56 * lv;                  // 柔和版：0.22 ~ 0.78（居中）
    float hard = step(0.5, lv);                     // 硬边版：纯 0 / 1
    // 「硬边程度」= 在柔和块与纯黑白块之间切换（refP3=0 全柔和，refP3=1 全硬边）。
    // 旧实现是往 0/1 线性 lerp，强度 0.55 时只走到 0.22/0.78 → 根本没有硬边。
    float v = lerp(base, hard, on * clamp(refP3, 0.0, 1.0));
    v *= 1.0 - 0.20 * on;                           // 被错位的列整体压暗，错位区域一眼可见
    return clamp(v, 0.0, 1.0);
}}
MF_Value MF_node1(float2 p,float aspect,float seconds){float4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;float2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float h=clamp(MF_graphic1(graphicUV,float4(_MF_1_displacement,_MF_1_columns,_MF_1_triggerThreshold,_MF_1_edgeHardness),float4(_MF_1_baseNoiseDensity,0.,0.,0.),float4(0.,0.,0.,0.),float4(0.,0.,0.,0.),time),0.,1.);result.color=float4(lerp(float3(0.,0.,0.),float3(1.,1.,1.),h)*h,h);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(float2 p,float aspect,float seconds){float4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
float4 MF_Evaluate(float2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
