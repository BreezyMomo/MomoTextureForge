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

precise float MF_graphic1_shash(float2 p,float time){return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
float MF_graphic1_snoise(float2 p,float time){float2 i=floor(p),f=frac(p);f=f*f*(3.-2.*f);return lerp(lerp(MF_graphic1_shash(i,time),MF_graphic1_shash(i+float2(1,0),time),f.x),lerp(MF_graphic1_shash(i+float2(0,1),time),MF_graphic1_shash(i+1.,time),f.x),f.y);}
float MF_graphic1_sfbm(float2 p,float time){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*MF_graphic1_snoise(p,time);p=mul(MF_mat2(.8,-.6,.6,.8),p)*2.03+3.7;a*=.5;}return n;}
float2x2 MF_graphic1_srot(float a,float time){return MF_mat2(cos(a),-sin(a),sin(a),cos(a));}
float MF_graphic1_sline(float d,float w,float time){return exp(-abs(d)/w);}
float3 MF_graphic1_cold(float x,float time){return lerp(float3(.11,.32,1.),float3(.28,1.,1.),clamp(x,0.,1.));}
float3 MF_graphic1_diskLayer(float2 p,float ph,float sd,float amt,float time){
 float2 q=mul(MF_graphic1_srot(.26,time),p); q.y*=2.8; float r=length(q),a=atan2(q.y,q.x);float3 c=float3(0,0,0);
 float region=smoothstep(.18,.27,r)*(1.-smoothstep(.67,.88,r));
 float turbulence=MF_graphic1_sfbm(float2(cos(a)*3.,sin(a)*3.)+float2(r*11.,0.)+float2(cos(ph),sin(ph))*.55+sd,time);
 float spiral=pow(.5+.5*sin(a*5.+r*32.-ph*2.+turbulence*5.),7.);
 c+=lerp(float3(.22,.055,.7),float3(.08,.75,1.),.5+.5*sin(a+r*8.))*spiral*region*.85;
 c+=float3(.09,.18,.42)*pow(turbulence,2.)*region*.3;
 for(int i=0;i<9;i++){float f=float(i);float rad=.235+f*.061;float wave=.009*sin(a*7.+ph*2.+f)+.004*sin(a*19.-ph*3.);float d=r-rad-wave;float flow=pow(.5+.5*sin(a*(3.+mod(f,3.))-ph*(1.+mod(f,2.))+f*2.1),3.);float arc=.12+.88*flow;float gl=MF_graphic1_sline(d,.0025,time)*1.5+MF_graphic1_sline(d,.014,time)*.28+MF_graphic1_sline(d,.05,time)*.045;c+=lerp(MF_graphic1_cold(.65,time),float3(.7,.15,1.),f/9.)*gl*arc;}
 // Near-side occlusion gives the central star physical depth.
 c*=lerp(1.,smoothstep(.12,.24,length(p)),step(0.,q.y));
 float2 jet=mul(MF_graphic1_srot(.26,time),p);float beams=exp(-abs(jet.x)/(.007+.022*abs(jet.y)))*exp(-abs(jet.y)*4.)*smoothstep(.08,.24,abs(jet.y));
 c+=float3(.10,.5,1.)*beams*(.5+.3*sin(ph*2.));
 return c*amt;
}
float4 MF_graphic1_generate(float2 uv,float time){
 float2 p=(uv*2.-1.)/max(_MF_1_sceneScale,.2);float ph=time*6.28318530718/max(_MF_1_loopDuration,.1);float sd=_MF_1_seed*.137;float3 c=float3(0,0,0);
 c+=MF_graphic1_diskLayer(p,ph,sd,_MF_1_ringPower,time);
 c=1.-exp(-max(c,float3(0,0,0))*_MF_1_exposure);
 float edge=1.-smoothstep(.87,1.1,length(p));
 c*=edge;float a=max(c.r,max(c.g,c.b));return float4(c/max(a,.00001),a);
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
