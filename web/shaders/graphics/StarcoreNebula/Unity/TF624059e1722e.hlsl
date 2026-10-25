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
float3 MF_graphic1_starfield(float2 p,float phase,float sd,float time){float3 c=float3(0,0,0);for(int k=0;k<3;k++){float sc=18.+float(k)*19.;float2 q=p*sc,cell=floor(q),v=frac(q)-.5;float h=MF_graphic1_shash(cell+sd+float(k)*31.,time);float2 off=float2(MF_graphic1_shash(cell+4.1,time),MF_graphic1_shash(cell+7.4,time))*.6-.3;float d=length(v-off);float pulse=.6+.4*sin(phase+6.283*h);float st=exp(-d*d/(.0006+.0008*h))*step(.84,h);c+=lerp(float3(.3,.5,1.),float3(1.,.74,.55),h)*st*pulse*(.25+float(k)*.15);}return c;}
float3 MF_graphic1_spaceLayer(float2 p,float ph,float sd,float time){float r=length(p);float2 q=mul(MF_graphic1_srot(.45,time),p);float n=MF_graphic1_sfbm(q*3.+float2(cos(ph),sin(ph))*.10+sd,time);float mist=pow(n,3.)*exp(-abs(q.y+.18*sin(q.x*3.))*3.);float3 c=float3(.13,.045,.28)*mist; c+=float3(.0,.12,.19)*pow(MF_graphic1_sfbm(p*4.+7.+sd,time),4.)*exp(-r);return c+MF_graphic1_starfield(p,ph,sd,time);}
float4 MF_graphic1_generate(float2 uv,float time){
 float2 p=(uv*2.-1.)/max(_MF_1_sceneScale,.2);float ph=time*6.28318530718/max(_MF_1_loopDuration,.1);float sd=_MF_1_seed*.137;float3 c=float3(0,0,0);
 c+=MF_graphic1_spaceLayer(p,ph,sd,time)*_MF_1_nebulaAmount;
 c=1.-exp(-max(c,float3(0,0,0))*_MF_1_exposure);
 float edge=1.-smoothstep(.87,1.1,length(p));
 c*=.5+.5*edge;
 // Output straight RGBA so empty space reveals the canvas background.
 float a=max(c.r,max(c.g,c.b));return float4(c/max(a,.00001),a);
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
