uniform vec4 _MF_0_placement;
uniform vec4 _MF_0_pivotTurn;
uniform float _MF_0_opacity;
uniform vec4 _MF_1_placement;
uniform vec4 _MF_1_pivotTurn;
uniform float _MF_1_opacity;
uniform float _MF_1_seed;
uniform float _MF_1_loopDuration;
uniform float _MF_1_sceneScale;
uniform float _MF_1_exposure;
uniform float _MF_1_ringPower;
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

float MF_graphic1_shash(vec2 p,float time){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float MF_graphic1_snoise(vec2 p,float time){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(MF_graphic1_shash(i,time),MF_graphic1_shash(i+vec2(1,0),time),f.x),mix(MF_graphic1_shash(i+vec2(0,1),time),MF_graphic1_shash(i+1.,time),f.x),f.y);}
float MF_graphic1_sfbm(vec2 p,float time){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*MF_graphic1_snoise(p,time);p=mat2(.8,-.6,.6,.8)*p*2.03+3.7;a*=.5;}return n;}
mat2 MF_graphic1_srot(float a,float time){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float MF_graphic1_sline(float d,float w,float time){return exp(-abs(d)/w);}
vec3 MF_graphic1_cold(float x,float time){return mix(vec3(.11,.32,1.),vec3(.28,1.,1.),clamp(x,0.,1.));}
vec3 MF_graphic1_diskLayer(vec2 p,float ph,float sd,float amt,float time){
 vec2 q=MF_graphic1_srot(.26,time)*p; q.y*=2.8; float r=length(q),a=atan(q.y,q.x);vec3 c=vec3(0);
 float region=smoothstep(.18,.27,r)*(1.-smoothstep(.67,.88,r));
 float turbulence=MF_graphic1_sfbm(vec2(cos(a)*3.,sin(a)*3.)+vec2(r*11.,0.)+vec2(cos(ph),sin(ph))*.55+sd,time);
 float spiral=pow(.5+.5*sin(a*5.+r*32.-ph*2.+turbulence*5.),7.);
 c+=mix(vec3(.22,.055,.7),vec3(.08,.75,1.),.5+.5*sin(a+r*8.))*spiral*region*.85;
 c+=vec3(.09,.18,.42)*pow(turbulence,2.)*region*.3;
 for(int i=0;i<9;i++){float f=float(i);float rad=.235+f*.061;float wave=.009*sin(a*7.+ph*2.+f)+.004*sin(a*19.-ph*3.);float d=r-rad-wave;float flow=pow(.5+.5*sin(a*(3.+mod(f,3.))-ph*(1.+mod(f,2.))+f*2.1),3.);float arc=.12+.88*flow;float gl=MF_graphic1_sline(d,.0025,time)*1.5+MF_graphic1_sline(d,.014,time)*.28+MF_graphic1_sline(d,.05,time)*.045;c+=mix(MF_graphic1_cold(.65,time),vec3(.7,.15,1.),f/9.)*gl*arc;}
 // Near-side occlusion gives the central star physical depth.
 c*=mix(1.,smoothstep(.12,.24,length(p)),step(0.,q.y));
 vec2 jet=MF_graphic1_srot(.26,time)*p;float beams=exp(-abs(jet.x)/(.007+.022*abs(jet.y)))*exp(-abs(jet.y)*4.)*smoothstep(.08,.24,abs(jet.y));
 c+=vec3(.10,.5,1.)*beams*(.5+.3*sin(ph*2.));
 return c*amt;
}
vec4 MF_graphic1_generate(vec2 uv,float time){
 vec2 p=(uv*2.-1.)/max(_MF_1_sceneScale,.2);float ph=time*6.28318530718/max(_MF_1_loopDuration,.1);float sd=_MF_1_seed*.137;vec3 c=vec3(0);
 c+=MF_graphic1_diskLayer(p,ph,sd,_MF_1_ringPower,time);
 c=1.-exp(-max(c,vec3(0))*_MF_1_exposure);
 float edge=1.-smoothstep(.87,1.1,length(p));
 c*=edge;float a=max(c.r,max(c.g,c.b));return vec4(c/max(a,.00001),a);
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
