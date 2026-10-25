uniform vec4 _MF_0_placement;
uniform vec4 _MF_0_pivotTurn;
uniform float _MF_0_opacity;
uniform vec4 _MF_1_placement;
uniform vec4 _MF_1_pivotTurn;
uniform float _MF_1_opacity;
uniform float _MF_1_eventHorizonRadius;
uniform float _MF_1_rotationSpeed;
uniform float _MF_1_diskStripeCount;
uniform float _MF_1_diskTilt;
uniform float _MF_1_accretionDiskRadius;
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
float MF_graphic1_ref_strokeD(float d, float w, float soft);
float MF_graphic1(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,float time);
float MF_graphic1_ref_smoothstep(float a,float b,float x){if(a==b)return step(a,x);float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
vec2 MF_graphic1_ref_smoothstep(vec2 a,vec2 b,vec2 x){return vec2(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y));}
vec2 MF_graphic1_ref_smoothstep(float a,float b,vec2 x){return MF_graphic1_ref_smoothstep(vec2(a),vec2(b),x);}
vec3 MF_graphic1_ref_smoothstep(vec3 a,vec3 b,vec3 x){return vec3(MF_graphic1_ref_smoothstep(a.x,b.x,x.x),MF_graphic1_ref_smoothstep(a.y,b.y,x.y),MF_graphic1_ref_smoothstep(a.z,b.z,x.z));}
float MF_graphic1_ref_strokeD(float d, float w, float soft){
  // 带状描边：|d| < w 内为 1，向外按 soft 羽化（旧实现误作向内填充，
  // 会导致 HUD 框线内部残留 0.5 灰底、Truchet 线条发灰）
  float hw = max(w, 0.0008);
  float so = max(soft, 0.0006);
  return 1.0 - MF_graphic1_ref_smoothstep(hw - so, hw + so, abs(d));
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

    // 奇点（黑洞）：暗事件视界 + 亮环 + 被引力弯折的扁吸积盘。
    float R = max(refP0, 0.04);
    float sp = max(refP1, 0.0);
    float r = length(p);
    float a = atan(p.y, p.x);
    // 吸积盘：竖向压扁的椭圆环，倾斜度可调（flat 是 GLSL 保留字，变量名避开）
    float flatk = mix(1.0, 0.14, clamp(refP3, 0.0, 1.0));
    float de = length(vec2(p.x, p.y / max(flatk, 0.08)));
    float Rdisk = R * max(refP4, 0.5);
    float disk = MF_graphic1_ref_strokeD(de - Rdisk, Rdisk * 0.34, Rdisk * 0.22);
    // 盘面旋纹
    float sw = 0.5 + 0.5 * sin(a * floor(max(refP2, 3.0)) + time * sp * 2.0 - r * 7.0);
    float v = disk * (0.30 + 0.70 * sw);
    // 事件视界亮环
    v = max(v, MF_graphic1_ref_strokeD(r - R, R * 0.20, R * 0.10));
    // 视界内部压黑
    v *= 1.0 - (1.0 - MF_graphic1_ref_smoothstep(R * 0.92, R * 1.02, r)) * 0.94;
    v *= 1.0 - MF_graphic1_ref_smoothstep(0.90, 1.05, r);
    return clamp(v, 0.0, 1.0);
}}
MF_Value MF_node1(vec2 p,float aspect,float seconds){vec4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;vec2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float h=clamp(MF_graphic1(graphicUV,vec4(_MF_1_eventHorizonRadius,_MF_1_rotationSpeed,_MF_1_diskStripeCount,_MF_1_diskTilt),vec4(_MF_1_accretionDiskRadius,0.,0.,0.),vec4(0.,0.,0.,0.),vec4(0.,0.,0.,0.),time),0.,1.);result.color=vec4(mix(vec3(0.,0.,0.),vec3(1.,1.,1.),h)*h,h);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(vec2 p,float aspect,float seconds){vec4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
vec4 MF_Evaluate(vec2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
