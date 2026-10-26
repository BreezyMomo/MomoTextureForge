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

precise float MF_graphic1_ehHash(float3 p,float time){p=frac(p*.1031);p+=dot(p,p.yzx+33.33);return frac((p.x+p.y)*p.z);}
float MF_graphic1_ehNoise(float3 p,float time){
 float3 i=floor(p),f=frac(p);f=f*f*(3.-2.*f);
 return lerp(lerp(lerp(MF_graphic1_ehHash(i,time),MF_graphic1_ehHash(i+float3(1,0,0),time),f.x),lerp(MF_graphic1_ehHash(i+float3(0,1,0),time),MF_graphic1_ehHash(i+float3(1,1,0),time),f.x),f.y),lerp(lerp(MF_graphic1_ehHash(i+float3(0,0,1),time),MF_graphic1_ehHash(i+float3(1,0,1),time),f.x),lerp(MF_graphic1_ehHash(i+float3(0,1,1),time),MF_graphic1_ehHash(i+float3(1,1,1),time),f.x),f.y),f.z);
}
float MF_graphic1_ehFbm(float3 p,float time){float v=0.,w=.5;for(int i=0;i<6;i++){v+=w*MF_graphic1_ehNoise(p,time);p=float3(-.80*p.y-.60*p.z,.80*p.x+.36*p.y-.48*p.z,.60*p.x-.48*p.y+.64*p.z)*2.03+float3(7.3,1.7,4.8);w*=.5;}return v;}
float3 MF_graphic1_ehColor(float packed,float time){return float3(floor(packed/65536.),mod(floor(packed/256.),256.),mod(packed,256.))/255.;}
float4 MF_graphic1_generate(float2 uv,float time){
 float2 p=(uv-.5)*2.;
 float drift=time*_MF_1_motionSpeed*.025;
 float3 z=float3(p*2.3,_MF_1_seed*.127+drift);
 float2 warp=float2(MF_graphic1_ehFbm(z+7.1,time),MF_graphic1_ehFbm(z+19.4,time));
 float broad=MF_graphic1_ehFbm(z+float3(warp*2.3,0.),time);
 float filaments=MF_graphic1_ehFbm(z*3.4+float3(warp*2.,0.),time);
 float detail=MF_graphic1_ehFbm(z*10.+float3(warp*4.,0.),time);
 // Diagonal dust lanes and illuminated turbulent cloud fronts.
 float lane=p.y+.32*p.x+.18*sin(p.x*2.3)+.23*(broad-.5);
 float cloudShape=exp(-pow((abs(lane)-.66)/.46,2.));
 float clouds=pow(smoothstep(.24,.78,broad),1.6)*cloudShape;
 float edge=pow(clamp(1.-abs(filaments-.49)*4.2,0.,1.),7.);
 float illumination=max(0.,broad-MF_graphic1_ehFbm(z+float3(warp*2.3,0.)+float3(-.16,.25,.06),time))*8.;
 float lum=clouds*(.23+illumination*1.7+filaments*.85+edge*.2+detail*.3)*_MF_1_nebulaDensity;
 float palette=smoothstep(-.65,.65,p.x+.2*p.y+(broad-.5)*2.5);
 float3 neb=lerp(MF_graphic1_ehColor(_MF_1_coldColor,time),MF_graphic1_ehColor(_MF_1_hotColor,time),palette);
 neb=lerp(neb,float3(.25,.055,.65),.22*(1.-cloudShape));
 float3 col=neb*lum;
 // Dust absorbs background light instead of adding a luminous fog.
 float dust=pow(MF_graphic1_ehFbm(z*3.+float3(warp,0.)*3.5,time),3.);
 col*=exp(-dust*5.);
 col+=neb*pow(edge,2.)*clouds*.08;
 // Three reproducible stellar scales, sparse bright stars with diffraction.
 for(int layer=0;layer<3;layer++){
  float scale=70.+float(layer)*63.;
  float2 cell=floor(uv*scale),f=frac(uv*scale)-.5;
  float h=MF_graphic1_ehHash(float3(cell,_MF_1_seed+float(layer)*23.),time);
  float2 offset=float2(MF_graphic1_ehHash(float3(cell,12.+_MF_1_seed),time),MF_graphic1_ehHash(float3(cell,41.+_MF_1_seed),time))*.7-.35;
  float2 d=f-offset;float rr=dot(d,d);
  float starWeight=step(.965-float(layer)*.006,h)*_MF_1_starDensity;
  float twinkle=.75+.25*sin(time*_MF_1_motionSpeed*.55+h*340.);
  float mfPoint=exp(-rr*(520.+float(layer)*260.));
  float flare=exp(-abs(d.x)*100.)*exp(-abs(d.y)*13.)+exp(-abs(d.y)*100.)*exp(-abs(d.x)*13.);
  float3 st=lerp(float3(.48,.73,1.),float3(1.,.75,.53),MF_graphic1_ehHash(float3(cell,9.),time));
  col+=st*(mfPoint+flare*.32*step(.989,h))*starWeight*twinkle*(1.4+float(layer)*.3);
 }
 col=1.-exp(-max(col,float3(0.,0.,0.))*1.9);
 float3 radiance=pow(col,float3(.83,.83,.83));
 float coverage=max(radiance.r,max(radiance.g,radiance.b));
 return coverage>.000001?float4(radiance/coverage,coverage):float4(0.,0.,0.,0.);
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
