uniform vec4 _MF_0_placement;
uniform vec4 _MF_0_pivotTurn;
uniform float _MF_0_opacity;
uniform vec4 _MF_1_placement;
uniform vec4 _MF_1_pivotTurn;
uniform float _MF_1_opacity;
uniform float _MF_1_beamCount;
uniform float _MF_1_spreadAngle;
uniform float _MF_1_falloffLength;
uniform float _MF_1_beamSoftness;
uniform float _MF_1_noiseStrength;
uniform vec4 _MF_1_uv;
uniform float _MF_1_uvTwist;
uniform vec4 _MF_1_clock;

const float MF_PI=3.14159265359;const float MF_TAU=6.28318530718;
struct MF_Value {vec4 color;float height;};
MF_Value MF_zero(){MF_Value v;v.color=vec4(0.);v.height=0.;return v;}
vec2 MF_rot(vec2 q,float a){float c=cos(a),s=sin(a);return vec2(c*q.x+s*q.y,-s*q.x+c*q.y);}
vec2 MF_place(vec2 p,vec4 box,vec4 axis,float aspect){p-=box.xy;p=MF_rot(p*vec2(aspect,1.),axis.z);p/=max(box.zw*vec2(aspect,1.),vec2(.000001));p.x*=axis.w;return p+axis.xy;}
vec4 MF_blend(vec4 dst,vec4 src,int mode){float a=src.a+dst.a*(1.-src.a);if(mode==0)return vec4(src.rgb+dst.rgb*(1.-src.a),a);vec3 d=dst.a>0.?dst.rgb/dst.a:vec3(0.),s=src.a>0.?src.rgb/src.a:vec3(0.);if(mode==10)return dst*src.a;if(mode==11)return dst*(1.-src.a);vec3 b=mode==6?abs(d-s):mode==7?mix(2.*d*s,1.-2.*(1.-d)*(1.-s),step(vec3(.5),d)):mode==8?(1.-2.*s)*d*d+2.*s*d:mode==9?min(vec3(1.),d/max(vec3(.00001),1.-s)):mode==1?d+s:mode==2?max(d,s):mode==3?d*s:mode==4?max(d-s,0.):1.-(1.-d)*(1.-s);return vec4((1.-src.a)*dst.rgb+(1.-dst.a)*src.rgb+src.a*dst.a*b,a);}
float MF_height(float d,float s,float a,int mode){if(mode==0)return s+d*(1.-a);if(mode==1)return d+s;if(mode==2)return max(d,s);if(mode==3)return mix(d,d*(a>0.?s/a:0.),a);if(mode==4)return max(d-s,0.);if(mode==6)return abs(d-s);if(mode==7)return d<.5?2.*d*s:1.-2.*(1.-d)*(1.-s);if(mode==8)return (1.-2.*s)*d*d+2.*s*d;if(mode==9)return min(1.,d/max(.00001,1.-s));if(mode==10)return d*a;if(mode==11)return d*(1.-a);return 1.-(1.-d)*(1.-s);}

float MF_graphic1_ref_smoothstep(float a,float b,float x);
vec2 MF_graphic1_ref_smoothstep(vec2 a,vec2 b,vec2 x);
vec2 MF_graphic1_ref_smoothstep(float a,float b,vec2 x);
vec3 MF_graphic1_ref_smoothstep(vec3 a,vec3 b,vec3 x);
float MF_graphic1_ref_hash1(vec2 p);
vec2 MF_graphic1_ref_hash2(vec2 p);
vec2 MF_graphic1_ref_hash2s(vec2 p);
float MF_graphic1_ref_perlin(vec2 p);
float MF_graphic1_ref_fbmP(vec2 p, int oct, float gain);
float MF_graphic1(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,float time);
float MF_graphic1_ref_smoothstep(float a,float b,float x){if(a==b)return step(a,x);float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
vec2 MF_graphic1_ref_smoothstep(vec2 a,vec2 b,vec2 x){return vec2(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y));}
vec2 MF_graphic1_ref_smoothstep(float a,float b,vec2 x){return MF_graphic1_ref_smoothstep(vec2(a),vec2(b),x);}
vec3 MF_graphic1_ref_smoothstep(vec3 a,vec3 b,vec3 x){return vec3(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y),MF_graphic1_ref_smoothstep(a.z,b.z,x.z));}
float MF_graphic1_ref_hash1(vec2 p){
  // Dave Hoskins hash12 —— 旧版在小整数格点上 (0,0)(1,0)(0,1)(1,1) 全部 < 0.5，
  // 会让「数量=2~4」的格子类图案整片空白
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 MF_graphic1_ref_hash2(vec2 p){
  float n = MF_graphic1_ref_hash1(p);
  return vec2(n, MF_graphic1_ref_hash1(p + n + 17.17));
}
vec2 MF_graphic1_ref_hash2s(vec2 p){ return MF_graphic1_ref_hash2(p) * 2.0 - 1.0; }
float MF_graphic1_ref_perlin(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(MF_graphic1_ref_hash2s(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
  float b = dot(MF_graphic1_ref_hash2s(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(MF_graphic1_ref_hash2s(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(MF_graphic1_ref_hash2s(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  float v = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  return clamp(v * 0.7 + 0.5, 0.0, 1.0);
}
float MF_graphic1_ref_fbmP(vec2 p, int oct, float gain){
  float v = 0.0, amp = 0.5, tot = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    v += amp * MF_graphic1_ref_perlin(p);
    tot += amp;
    p = p * 2.01 + vec2(5.2, 1.3);
    amp *= gain;
  }
  return v / max(tot, 1e-4);
}
float MF_graphic1(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,float time){vec2 q=u*2.-1.;float r=length(q),angle=atan(q.y,q.x);float R=a.x,W=a.y,N=a.z,S=a.w,D=b.x,K=b.y,H=b.z,T=time*b.w;{vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 光源固定在画面下方中心 → 向上发散的光柱（丁达尔 / 神光）
    vec2 dir = p - vec2(0.0, -0.95);
    float d = length(dir);
    float a = atan(dir.x, dir.y);
    float n = floor(max(refP0, 4.0));
    float ang = max(refP1, 0.12);
    float win = 1.0 - MF_graphic1_ref_smoothstep(ang * 0.55, ang, abs(a));
    // 「光柱数」按可见锥（±张角）均分 —— 若按整圈 2π 均分，锥内只剩 1~2 条，
    // 参数名与画面完全对不上（v0.12 修）
    float seg = (2.0 * ang) / max(n, 2.0);
    float k = floor(a / seg + 0.5);
    float ac = k * seg;
    float sh = pow(max(cos((a - ac) / seg * 3.14159265359), 0.0), max(1.1, 3.6 * refP3));
    float fade = exp(-d / max(refP2, 0.15)) * MF_graphic1_ref_smoothstep(0.0, 0.07, d);
    float brk = 1.0 - clamp(refP4, 0.0, 1.0) * (1.0 - MF_graphic1_ref_fbmP(p * 2.6 + vec2(0.0, 3.0), 3, 0.5));
    return clamp(sh * fade * win * brk * 2.4, 0.0, 1.0);
}}
MF_Value MF_node1(vec2 p,float aspect,float seconds){vec4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;vec2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float h=clamp(MF_graphic1(graphicUV,vec4(_MF_1_beamCount,_MF_1_spreadAngle,_MF_1_falloffLength,_MF_1_beamSoftness),vec4(_MF_1_noiseStrength,0.,0.,0.),vec4(0.,0.,0.,0.),vec4(0.,0.,0.,0.),time),0.,1.);result.color=vec4(mix(vec3(0.,0.,0.),vec3(1.,1.,1.),h)*h,h);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(vec2 p,float aspect,float seconds){vec4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
vec4 MF_Evaluate(vec2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
