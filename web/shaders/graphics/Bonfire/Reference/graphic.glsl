uniform vec4 _MF_0_placement;
uniform vec4 _MF_0_pivotTurn;
uniform float _MF_0_opacity;
uniform vec4 _MF_1_placement;
uniform vec4 _MF_1_pivotTurn;
uniform float _MF_1_opacity;
uniform float _MF_1_seed;
uniform float _MF_1_speed;
uniform float _MF_1_scale;
uniform float _MF_1_width;
uniform float _MF_1_baseHeight;
uniform float _MF_1_turbulence;
uniform float _MF_1_intensity;
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

float MF_graphic1_motionHash(vec3 p,float time){p=fract(p*.1031+_MF_1_seed*.001);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float MF_graphic1_motionNoise(vec3 p,float time){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(MF_graphic1_motionHash(i,time),MF_graphic1_motionHash(i+vec3(1,0,0),time),f.x),mix(MF_graphic1_motionHash(i+vec3(0,1,0),time),MF_graphic1_motionHash(i+vec3(1,1,0),time),f.x),f.y),mix(mix(MF_graphic1_motionHash(i+vec3(0,0,1),time),MF_graphic1_motionHash(i+vec3(1,0,1),time),f.x),mix(MF_graphic1_motionHash(i+vec3(0,1,1),time),MF_graphic1_motionHash(i+vec3(1),time),f.x),f.y),f.z);}
float MF_graphic1_motionFbm(vec3 p,float time){float sum=0.,a=.5;for(int i=0;i<5;i++){sum+=a*MF_graphic1_motionNoise(p,time);p=p*2.03+vec3(7.1,3.7,5.2);a*=.5;}return sum;}
vec4 MF_graphic1_generate(vec2 uv,float time){
 float y=uv.y/_MF_1_baseHeight,t=time*_MF_1_speed;
 vec2 p=vec2((uv.x-.5)/_MF_1_width,y);
 float n=MF_graphic1_motionFbm(vec3(p.x*_MF_1_scale,y*_MF_1_scale-t,t*.2),time);
 float sway=(MF_graphic1_motionNoise(vec3(y*3.,t*.4,_MF_1_seed),time)-.5)*_MF_1_turbulence*y;
 float taper=max(.04,1.-y*.85);
 float fuel=1.-abs(p.x+sway)/taper-y*.65+(n-.45)*_MF_1_turbulence;
 float a=smoothstep(.0,.22,fuel)*smoothstep(0.,.04,uv.y)*(1.-smoothstep(.9,1.,y));
 float heat=clamp(fuel*1.5,0.,1.);
 vec3 c=mix(vec3(.8,.035,.003),vec3(1.,.4,.02),heat);
 c=mix(c,vec3(1.,.93,.55),pow(heat,3.))*_MF_1_intensity;
 return vec4(c,a);
}
MF_Value MF_node1(vec2 p,float aspect,float seconds){vec4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;vec2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
vec4 raw=MF_graphic1_generate(graphicUV,time);if(graphicUV.x<0.||graphicUV.y<0.||graphicUV.x>1.||graphicUV.y>1.)raw=vec4(0.);float h=clamp(dot(raw.rgb,vec3(.2126,.7152,.0722))*raw.a,0.,1.);result.color=vec4(raw.rgb*raw.a,raw.a);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(vec2 p,float aspect,float seconds){vec4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,vec4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
vec4 MF_Evaluate(vec2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
