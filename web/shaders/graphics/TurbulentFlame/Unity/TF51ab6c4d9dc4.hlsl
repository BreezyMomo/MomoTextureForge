#ifndef MF_GLSL_MOD
#define MF_GLSL_MOD
#define mod(x,y) ((x)-(y)*floor((x)/(y)))
#define lessThan(x,y) ((x)<(y))
#define greaterThan(x,y) ((x)>(y))
#define lessThanEqual(x,y) ((x)<=(y))
#define greaterThanEqual(x,y) ((x)>=(y))
#define equal(x,y) ((x)==(y))
#define notEqual(x,y) ((x)!=(y))
#endif


static const float MF_PI=3.14159265359;static const float MF_TAU=6.28318530718;
struct MF_Value {float4 color;float height;};
MF_Value MF_zero(){MF_Value v;v.color=float4(0.,0.,0.,0.);v.height=0.;return v;}
float2 MF_rot(float2 q,float a){float c=cos(a),s=sin(a);return float2(c*q.x+s*q.y,-s*q.x+c*q.y);}
float2 MF_place(float2 p,float4 box,float4 axis,float aspect){p-=box.xy;p=MF_rot(p*float2(aspect,1.),axis.z);p/=max(box.zw*float2(aspect,1.),float2(.000001,.000001));p.x*=axis.w;return p+axis.xy;}
float4 MF_blend(float4 dst,float4 src,int mode){float a=src.a+dst.a*(1.-src.a);if(mode==0)return float4(src.rgb+dst.rgb*(1.-src.a),a);float3 d=dst.a>0.?dst.rgb/dst.a:float3(0.,0.,0.),s=src.a>0.?src.rgb/src.a:float3(0.,0.,0.);if(mode==10)return dst*src.a;if(mode==11)return dst*(1.-src.a);float3 b=mode==6?abs(d-s):mode==7?lerp(2.*d*s,1.-2.*(1.-d)*(1.-s),step(float3(.5,.5,.5),d)):mode==8?(1.-2.*s)*d*d+2.*s*d:mode==9?min(float3(1.,1.,1.),d/max(float3(.00001,.00001,.00001),1.-s)):mode==1?d+s:mode==2?max(d,s):mode==3?d*s:mode==4?max(d-s,0.):1.-(1.-d)*(1.-s);return float4((1.-src.a)*dst.rgb+(1.-dst.a)*src.rgb+src.a*dst.a*b,a);}
float MF_height(float d,float s,float a,int mode){if(mode==0)return s+d*(1.-a);if(mode==1)return d+s;if(mode==2)return max(d,s);if(mode==3)return lerp(d,d*(a>0.?s/a:0.),a);if(mode==4)return max(d-s,0.);if(mode==6)return abs(d-s);if(mode==7)return d<.5?2.*d*s:1.-2.*(1.-d)*(1.-s);if(mode==8)return (1.-2.*s)*d*d+2.*s*d;if(mode==9)return min(1.,d/max(.00001,1.-s));if(mode==10)return d*a;if(mode==11)return d*(1.-a);return 1.-(1.-d)*(1.-s);}

float2 MF_graphic1_rot(float2 q,float a,float time){return MF_rot(q,a);}
precise float MF_graphic1_hash21(float2 p,float time){p=frac(p*float2(.1031,.11369));p+=dot(p,p.yx+19.19);return frac(p.x*p.y*(p.x+p.y));}
float MF_graphic1_noise(float2 p,float time){float2 i=floor(p),f=frac(p);f=f*f*(3.-2.*f);return lerp(lerp(MF_graphic1_hash21(i,time),MF_graphic1_hash21(i+float2(1.,0.),time),f.x),lerp(MF_graphic1_hash21(i+float2(0.,1.),time),MF_graphic1_hash21(i+1.,time),f.x),f.y);}
float2 MF_graphic1_grad(float2 p,float time){float a=MF_graphic1_hash21(p,time)*MF_TAU;return float2(cos(a),sin(a));}
float MF_graphic1_perlin(float2 p,float time){float2 i=floor(p),f=frac(p),w=f*f*f*(f*(f*6.-15.)+10.);return lerp(lerp(dot(MF_graphic1_grad(i,time),f),dot(MF_graphic1_grad(i+float2(1,0),time),f-float2(1,0)),w.x),lerp(dot(MF_graphic1_grad(i+float2(0,1),time),f-float2(0,1)),dot(MF_graphic1_grad(i+1.,time),f-1.),w.x),w.y)*1.7;}
float MF_graphic1_fbm(float2 p,float time){float v=0.,w=.5;for(int i=0;i<5;i++){v+=w*MF_graphic1_noise(p,time);p=MF_graphic1_rot(p,.47,time)*2.03+13.7;w*=.5;}return v/ .96875;}
float MF_graphic1_gSigned(float2 p,float time){return MF_graphic1_perlin(p+float2(_MF_1_seed*.137+3.7,_MF_1_seed*.293+1.4),time);}
float MF_graphic1_gFbm(float2 p,int count,float time){float sum=0.,amplitude=.5;float2x2 turn=float2x2(.8,-.6,.6,.8);for(int octave=0;octave<8;octave++){if(octave>=count)break;sum+=amplitude*MF_graphic1_gSigned(p,time);p=mul(turn,p)*2.+100.;amplitude*=.5;}return sum;}
float MF_graphic1_gTurb(float2 p,int count,float time){float sum=0.,amplitude=.5;for(int octave=0;octave<8;octave++){if(octave>=count)break;sum+=amplitude*abs(MF_graphic1_gSigned(p,time));p=MF_graphic1_rot(p,.64,time)*2.+71.;amplitude*=.5;}return sum;}
float MF_graphic1_gRidged(float2 p,int count,float time){float value=0.,weight=.5;for(int i=0;i<8;i++){if(i>=count)break;float ridge=1.-abs(MF_graphic1_gSigned(p,time));value+=ridge*ridge*weight;p=MF_graphic1_rot(p,.64,time)*2.+100.;weight*=.5;}return value;}
float2 MF_graphic1_gWarp(float2 p,int count,float time){float2 first=float2(MF_graphic1_gFbm(p,count,time),MF_graphic1_gFbm(p+float2(5.2,1.3),count,time));return float2(MF_graphic1_gFbm(p+first*2.+float2(1.7,9.2),count,time),MF_graphic1_gFbm(p+first*2.+float2(8.3,2.8),count,time));}
float3 MF_graphic1_fireRamp(float temperature,float time){
 float3 red=float3(.3,.015,0),orange=float3(1.,.28,0),yellow=float3(1.,.8,.14),hot=float3(1.,.93,.47);
 float3 low=lerp(float3(.015,0,0),red,smoothstep(0.,.08,temperature));
 low=lerp(low,orange,smoothstep(.08,.32,temperature));low=lerp(low,yellow,smoothstep(.32,.72,temperature));return lerp(low,hot,smoothstep(.72,1.,temperature));
}
float4 MF_graphic1_generate(float2 uv,float time){
 float motion=time*_MF_1_motionSpeed;float height=max(_MF_1_flameHeight,.01);float h=(uv.y-_MF_1_baseY)/height;float2 p=float2(uv.x-.5,uv.y-_MF_1_baseY);
 float normalizedX=abs(p.x)/max(_MF_1_width*(1.-clamp(h,0.,1.)*_MF_1_taper*.8),.01);
 float2 stretched=p*_MF_1_warpScale*float2(3.,1.)-float2(0.,h*7.)+float2(motion*.13,-motion*1.8);
 float2 first=float2(MF_graphic1_gFbm(stretched*.7,int(_MF_1_octaves),time),MF_graphic1_gFbm(stretched*.7+float2(5.2,1.3),int(_MF_1_octaves),time))*_MF_1_warp*1.5;
 float2 second=float2(MF_graphic1_gFbm(stretched+first*4.+float2(1.7,9.2),int(_MF_1_octaves),time),MF_graphic1_gFbm(stretched+first*4.+float2(8.3,2.8),int(_MF_1_octaves),time))*_MF_1_warp*.85;
 float2 fine=float2(MF_graphic1_gSigned((stretched+first+second)*3.5+float2(13.1,7.4),time),MF_graphic1_gSigned((stretched+first+second)*3.5+float2(3.7,11.2),time))*_MF_1_warp*.4*(1.+smoothstep(.3,.9,normalizedX)*2.);
 float2 warped=stretched+first+second+fine;
 float turbulence=MF_graphic1_gRidged(warped,int(_MF_1_octaves),time)*1.6+MF_graphic1_gTurb(warped*2.+float2(30,70),max(2,int(_MF_1_octaves)-1),time)*.5+MF_graphic1_gTurb(warped*5.+float2(50,20),max(2,int(_MF_1_octaves)-2),time)*.15+abs(MF_graphic1_gSigned(warped*10.+float2(77,33),time))*.06;
 float channels=.35+.65*(MF_graphic1_gRidged(float2(p.x*_MF_1_warpScale*3.6+_MF_1_seed*.3,h*.4-motion*.15),3,time)+MF_graphic1_gRidged(float2(p.x*_MF_1_warpScale*7.5+50.+_MF_1_seed*.7,h*.6-motion*.2),2,time)*.4);
 float tongueHeight=MF_graphic1_gRidged(float2(p.x*6.+_MF_1_seed*.5,motion*.3),2,time)*_MF_1_disparity;
 float tips=1.-smoothstep(tongueHeight,tongueHeight+.3,h);
 float fuel=.2+_MF_1_fillAmount*.8-h*(1.2+max(h,0.)*.5)+turbulence*(.8+_MF_1_fillAmount*.2);
 float silhouette=1.-smoothstep(.3,1.05,normalizedX);
 silhouette=clamp(silhouette+MF_graphic1_gFbm(warped*2.5,max(2,int(_MF_1_octaves)-1),time)*.45*(1.-normalizedX*.4),0.,1.);
 float density=pow(clamp(fuel*channels*tips*silhouette,0.,1.5),1.9-_MF_1_fillAmount*.6);
 density*=1.-_MF_1_flicker*(MF_graphic1_gFbm(p*3.+_MF_1_seed*10.,2,time)*.3+MF_graphic1_gSigned(float2(p.x*10.,_MF_1_seed*5.),time)*.15);
 density*=smoothstep(-.03,.02,h);density=clamp(density,0.,1.);
 float core=pow(max(0.,1.-normalizedX),1.2);
 float heat=clamp(density*lerp(_MF_1_edgeTemp*.4,_MF_1_coreTemp,core)*(1.-h*.4),0.,1.);
 float textureValue=.45+MF_graphic1_gTurb(warped*2.+float2(17.3,53.1),max(3,int(_MF_1_octaves)-1),time)*1.1;
 float3 emitted=MF_graphic1_fireRamp(heat,time)*lerp(1.,textureValue,density*(1.-smoothstep(.25,.85,normalizedX))*(1.-h*.55)*.72)*_MF_1_intensity;
 float alpha=smoothstep(0.,.04,density);
 emitted*=alpha;
 float bed=(1.-smoothstep(-.03,.08,h))*(1.-smoothstep(0.,_MF_1_width*1.6,abs(p.x)))*_MF_1_width*3.5;
 bed*=1.+abs(MF_graphic1_gFbm(float2(p.x*18.,_MF_1_seed*3.),3,time))*.5;emitted+=float3(1,.5,.1)*bed*_MF_1_intensity*.6;alpha=max(alpha,bed*.6);
 float fogField=MF_graphic1_fbm(float2(p.x*_MF_1_warpScale*1.3,p.y*_MF_1_warpScale*.55)+first*.45+_MF_1_seed*.03,time);
 float mist=fogField*(1.-smoothstep(-.05,1.1,h))*(1.-smoothstep(0.,1.6,normalizedX*(1.+max(h,0.)*.6)))*_MF_1_fogBase;
 emitted+=lerp(float3(.5,.1,0),float3(.9,.38,.04),fogField)*mist*_MF_1_intensity*.7;alpha=max(alpha,mist*.6);
 float sparkZone=smoothstep(.1,.5,h)*(1.-smoothstep(.6,1.4,h))*(1.-smoothstep(0.,_MF_1_width*2.5,abs(p.x)));
 float specks=smoothstep(.7,.95,MF_graphic1_gSigned(p*float2(55,60)+_MF_1_seed+first*4.,time))*sparkZone;
 emitted+=float3(1,.6,.15)*specks*_MF_1_intensity;alpha=max(alpha,specks*.9);
 // Smoke has its own rising, widening volume behind the emissive flame.
 // Height and spread change the plume silhouette rather than multiplying opacity.
 float smokeStart=_MF_1_baseY+height*.28;
 float smokeHeight=max((1.-smokeStart)*lerp(.2,1.,clamp(_MF_1_smokeRise,0.,1.)),.01);
 float smokeT=(uv.y-smokeStart)/smokeHeight;
 float2 smokeCoord=float2(p.x*_MF_1_warpScale*1.6,smokeT*2.8-motion*.5);
 float2 smokeWarp=MF_graphic1_gWarp(smokeCoord, int(_MF_1_octaves),time);
 float drift=smokeWarp.x*(.04+.12*clamp(smokeT,0.,1.));
 float smokeWidth=.035+_MF_1_width*.1+_MF_1_smokeSpread*.23+clamp(smokeT,0.,1.)*(.04+_MF_1_smokeSpread*.25);
 float smokeX=abs(p.x-drift)/max(smokeWidth,.01);
 float plume=1.-smoothstep(.25,1.,smokeX);
 plume*=smoothstep(0.,.12,smokeT)*(1.-smoothstep(.55,1.,smokeT));
 float billows=clamp(.6+MF_graphic1_gFbm(smokeCoord+smokeWarp*3.,int(_MF_1_octaves),time)*1.3,.12,1.);
 float smoke=clamp(_MF_1_smokeMix,0.,1.)*(1.-exp(-max(_MF_1_smokeDensity,0.)*plume*billows*3.));
 alpha=clamp(alpha,0.,1.);
 float smokeBehind=smoke*(1.-alpha);
 emitted+=lerp(float3(.22,.20,.18),float3(.42,.39,.35),billows)*smokeBehind;
 alpha+=smokeBehind;
 return float4(alpha>.00001?emitted/alpha:float3(0,0,0),alpha);
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
