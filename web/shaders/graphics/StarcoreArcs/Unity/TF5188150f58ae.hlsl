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
float2x2 MF_graphic1_srot(float a,float time){return MF_mat2(cos(a),-sin(a),sin(a),cos(a));}
float MF_graphic1_sline(float d,float w,float time){return exp(-abs(d)/w);}
float3 MF_graphic1_cold(float x,float time){return lerp(float3(.11,.32,1.),float3(.28,1.,1.),clamp(x,0.,1.));}
float3 MF_graphic1_hot(float x,float time){return lerp(float3(1.,.13,.045),float3(1.,.85,.43),clamp(x,0.,1.));}
float MF_graphic1_angled(float a,float b,float time){return atan2(sin(a-b),cos(a-b));}
float3 MF_graphic1_fieldLayer(float2 p,float ph,float sd,float amount,float time){
 float r=length(p),a=atan2(p.y,p.x);float3 c=float3(0,0,0);
 for(int i=0;i<3;i++){float f=float(i);float rr=.36+f*.115;float wob=.014*sin(a*(7.+f*2.)+ph*2.+f)+.007*sin(a*31.-ph*3.+f);float d=r-rr-wob;float gate=smoothstep(.10,.8,.5+.5*sin(a*3.-ph*(1.+f)+f*3.));c+=lerp(MF_graphic1_cold(1.,time),float3(.75,.12,1.),f*.45)*(MF_graphic1_sline(d,.0016,time)*1.5+MF_graphic1_sline(d,.009,time)*.27+MF_graphic1_sline(d,.03,time)*.065)*gate;}
 // Two inclined orbital planes, counter-rotating light packets.
 for(int i=0;i<2;i++){float f=float(i);float2 q=mul(MF_graphic1_srot(-.8+f*1.65,time),p); q.y*=1.6;float rr=length(q),aa=atan2(q.y,q.x);float mask=.2+.8*pow(.5+.5*cos(aa*2.+ph*(1.+f)*2.),8.);c+=lerp(float3(.14,.8,1.),float3(.8,.16,1.),f)*(MF_graphic1_sline(rr-.69,.0018,time)+MF_graphic1_sline(rr-.69,.014,time)*.12)*mask;}
 float ticks=pow(max(0.,cos(a*96.-ph*2.)),24.);c+=float3(.14,.5,.75)*ticks*MF_graphic1_sline(r-.79,.008,time)*.45;
 float fine=(MF_graphic1_sline(r-.758,.001,time)+MF_graphic1_sline(r-.815,.001,time))*.10;c+=float3(.15,.45,.65)*fine;
 // Outward-moving plasma seeds, addressed in polar cells.
 float ai=(a+3.14159265)/6.2831853*72.;float cell=floor(ai);
 for(int j=-1;j<=1;j++){float idx=mod(cell+float(j)+72.,72.);float h=MF_graphic1_shash(float2(idx,sd+13.),time);float pa=(idx+.2+h*.6)/72.*6.2831853-3.14159265;float age=frac(ph/6.2831853+h);float pr=.2+age*.67;float da=MF_graphic1_angled(a,pa+sin(ph)*.018,time);float d=length(float2((r-pr)*.6,da*max(r,.1)));float fade=sin(age*3.14159265);float3 col=lerp(MF_graphic1_cold(1.,time),MF_graphic1_hot(.6,time),step(.78,h));c+=col*(MF_graphic1_sline(d,.0018,time)*2.+MF_graphic1_sline(d,.009,time)*.22)*fade;float trail=exp(-abs(da)*r/.0015)*exp(-abs(r-pr+.022)/.022)*.1;c+=col*trail*fade;}
 float wave=frac(ph/6.2831853);float wr=.18+.72*wave;float shock=MF_graphic1_sline(r-wr,.002,time)*pow(sin(wave*3.14159265),2.);c+=float3(.22,.65,1.)*shock*.22;
 return c*amount;
}
float4 MF_graphic1_generate(float2 uv,float time){
 float2 p=(uv*2.-1.)/max(_MF_1_sceneScale,.2);float ph=time*6.28318530718/max(_MF_1_loopDuration,.1);float sd=_MF_1_seed*.137;float3 c=float3(0,0,0);
 c+=MF_graphic1_fieldLayer(p,ph,sd,_MF_1_sparkPower,time);
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
