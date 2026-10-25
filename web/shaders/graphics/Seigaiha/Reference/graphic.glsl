uniform vec4 _MF_0_placement;
uniform vec4 _MF_0_pivotTurn;
uniform float _MF_0_opacity;
uniform vec4 _MF_1_placement;
uniform vec4 _MF_1_pivotTurn;
uniform float _MF_1_opacity;
uniform float _MF_1_packingCount;
uniform float _MF_1_ringCount;
uniform float _MF_1_lineWidth;
uniform float _MF_1_softness;
uniform float _MF_1_rowOffset;
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
float MF_graphic1(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,float time);
float MF_graphic1_ref_smoothstep(float a,float b,float x){if(a==b)return step(a,x);float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
vec2 MF_graphic1_ref_smoothstep(vec2 a,vec2 b,vec2 x){return vec2(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y));}
vec2 MF_graphic1_ref_smoothstep(float a,float b,vec2 x){return MF_graphic1_ref_smoothstep(vec2(a),vec2(b),x);}
vec3 MF_graphic1_ref_smoothstep(vec3 a,vec3 b,vec3 x){return vec3(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y),MF_graphic1_ref_smoothstep(a.z,b.z,x.z));}
float MF_graphic1(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,float time){vec2 q=u*2.-1.;float r=length(q),angle=atan(q.y,q.x);float R=a.x,W=a.y,N=a.z,S=a.w,D=b.x,K=b.y,H=b.z,T=time*b.w;{vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 青海波（日本传统鱼鳞纹）：交错半圆格，每格圆心在格子下边中点，
    // 只保留上半圆 → 一圈圈同心弧叠加成鱼鳞。
    float n = floor(max(refP0, 3.0));
    vec2 gp = p * (n * 0.5);
    gp.x += mod(floor(gp.y + 0.5) + 1.0, 2.0) * clamp(refP4, 0.0, 0.5);
    vec2 lc = fract(gp + 0.5) - 0.5;
    vec2 rel = vec2(lc.x, lc.y - 0.5);          // 圆心 → 格子下边中点
    float rr = length(rel);
    float rings = floor(max(refP1, 1.0));
    float t = rr * rings;
    float dl = abs(fract(t) - 0.5) / rings;     // 到最近弧线的径向距离
    // 线宽按 p 单位给：gp = p*(n*0.5)，即局部空间相对 p 放大 n/2 倍
    float w = min(max(refP2, 0.0015) * (n * 0.5), 0.30);
    float v = 1.0 - MF_graphic1_ref_smoothstep(w, w * (1.0 + max(refP3, 0.2) * 1.6), dl);
    v *= MF_graphic1_ref_smoothstep(0.46, 0.40, -rel.y);        // 只保留上半圆
    return clamp(v, 0.0, 1.0);
}}
MF_Value MF_node1(vec2 p,float aspect,float seconds){vec4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;vec2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float h=clamp(MF_graphic1(graphicUV,vec4(_MF_1_packingCount,_MF_1_ringCount,_MF_1_lineWidth,_MF_1_softness),vec4(_MF_1_rowOffset,0.,0.,0.),vec4(0.,0.,0.,0.),vec4(0.,0.,0.,0.),time),0.,1.);result.color=vec4(mix(vec3(0.,0.,0.),vec3(1.,1.,1.),h)*h,h);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(vec2 p,float aspect,float seconds){vec4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
vec4 MF_Evaluate(vec2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
