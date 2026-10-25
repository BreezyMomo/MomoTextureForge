uniform vec4 _MF_0_placement;
uniform vec4 _MF_0_pivotTurn;
uniform float _MF_0_opacity;
uniform vec4 _MF_1_placement;
uniform vec4 _MF_1_pivotTurn;
uniform float _MF_1_opacity;
uniform float _MF_1_heightRatio;
uniform float _MF_1_widthRatio;
uniform float _MF_1_borderThickness;
uniform float _MF_1_feather;
uniform float _MF_1_arcBend;
uniform float _MF_1_flowerCenterSize;
uniform float _MF_1_borderRatio;
uniform float _MF_1_accentDotSize;
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

float MF_graphic1_sat(float x);
float MF_graphic1_fill(float d,float s);
float MF_graphic1(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,float time);
float MF_graphic1_sat(float x){return clamp(x,0.,1.);}
float MF_graphic1_fill(float d,float s){float aa=max(fwidth(d),.00001);return 1.-smoothstep(-aa*.5,max(s,0.)+aa*.5,d);}
float MF_graphic1(vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,float time){vec2 q=u*2.-1.;float r=length(q),angle=atan(q.y,q.x);float R=a.x,W=a.y,N=a.z,S=a.w,D=b.x,K=b.y,H=b.z,T=time*b.w;{// Single editable motif. Repetition belongs to the general arrangement stage.
vec2 z=abs((u-.5)/vec2(R,N));
float soft=max(S,.45*length(fwidth(u)));
vec2 target=z/H;
float edge=1.;
for(int curve=0;curve<2;curve++){
  vec2 a0=curve==0?vec2(0.,.385):vec2(.202,.20);
  vec2 a1=curve==0?vec2(.09,.385):vec2(.17,.11);
  vec2 a2=curve==0?vec2(.025,.245):vec2(.32,.15);
  vec2 a3=curve==0?vec2(.202,.20):vec2(.32,0.);
  // Curvature changes handles without moving the measured endpoints.
  float bend=D/.065;
  a1=mix(mix(a0,a3,1./3.),a1,bend);
  a2=mix(mix(a0,a3,2./3.),a2,bend);
  vec2 previous=a0;
  for(int n=1;n<=12;n++){
    float t=float(n)/12., s=1.-t;
    vec2 next=s*s*s*a0+3.*s*s*t*a1+3.*s*t*t*a2+t*t*t*a3;
    vec2 segment=next-previous, delta=target-previous;
    float at=clamp(dot(delta,segment)/max(dot(segment,segment),.000001),0.,1.);
    edge=min(edge,length(delta-segment*at));
    previous=next;
  }
}
float border=MF_graphic1_fill(edge*H-W,soft);
// Connected diagonal petals (an X), not four oval lobes.
vec2 flowerPoint=z/max(K,.001);
float flowerDistance=max(abs(flowerPoint.x-flowerPoint.y)-(.20+.15*(flowerPoint.x+flowerPoint.y)),max(flowerPoint.x,flowerPoint.y)-1.);
float flower=MF_graphic1_fill(flowerDistance*K,soft);
float dotDistance=min(length(z-vec2(.20,0.)),length(z-vec2(0.,.20)));
float dots=b.w>0.?MF_graphic1_fill(dotDistance-b.w,soft):0.;
return MF_graphic1_sat(max(border,max(flower,dots)));
}}
MF_Value MF_node1(vec2 p,float aspect,float seconds){vec4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;vec2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float h=clamp(MF_graphic1(graphicUV,vec4(_MF_1_widthRatio,_MF_1_borderThickness,_MF_1_heightRatio,_MF_1_feather),vec4(_MF_1_arcBend,_MF_1_flowerCenterSize,_MF_1_borderRatio,_MF_1_accentDotSize),vec4(0.,0.,0.,0.),vec4(0.,0.,0.,0.),time),0.,1.);result.color=vec4(mix(vec3(0.,0.,0.),vec3(1.,1.,1.),h)*h,h);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(vec2 p,float aspect,float seconds){vec4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
vec4 MF_Evaluate(vec2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
