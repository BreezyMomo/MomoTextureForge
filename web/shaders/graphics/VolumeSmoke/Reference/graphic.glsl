uniform vec4 _MF_0_placement;
uniform vec4 _MF_0_pivotTurn;
uniform float _MF_0_opacity;
uniform vec4 _MF_1_placement;
uniform vec4 _MF_1_pivotTurn;
uniform float _MF_1_opacity;
uniform float _MF_1_seed;
uniform float _MF_1_speed;
uniform float _MF_1_scale;
uniform float _MF_1_radius;
uniform float _MF_1_density;
uniform float _MF_1_turbulence;
uniform float _MF_1_lightDirection;
uniform float _MF_1_lightStrength;
uniform float _MF_1_temperature;
uniform float _MF_1_quality;
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
float MF_graphic1_volumeDensity(vec3 p,int kind,float t,float _MF_1_scale,float _MF_1_radius,float _MF_1_turbulence,float time){
 vec3 q=p*_MF_1_scale;float phase=fract(t*.23+.12);
 if(kind==0)q.y-=t*2.;else if(kind==2)q.y-=t*.5;else q/=max(.3,.5+phase);
 float noise=MF_graphic1_motionFbm(q+vec3(0,0,t*.17),time);
 if(kind==0){
  float y=(p.y+.9)/1.8,width=max(.03,_MF_1_radius*.65*(1.-y*.85));
  float inside=1.-length(p.xz+vec2((noise-.5)*.18*_MF_1_turbulence,0))/width-y*.6+(noise-.5)*_MF_1_turbulence;
  return smoothstep(0.,.4,inside)*smoothstep(0.,.08,y)*(1.-smoothstep(.9,1.,y))*(.4+noise);
 }
 float extent=kind==1?_MF_1_radius*(.25+phase*.85):_MF_1_radius;
 float envelope=length(p/vec3(extent,extent*(kind==2?1.1:1.),extent));
 float _MF_1_density=(1.-smoothstep(.4,1.,envelope+(noise-.5)*_MF_1_turbulence))*(.25+noise*.75);
 if(kind==1)_MF_1_density*=smoothstep(0.,.07,phase)*(1.-smoothstep(.55,1.,phase));
 return _MF_1_density;
}
vec4 MF_graphic1_volumeRender(vec2 uv,int kind,float _MF_1_speed,float _MF_1_scale,float _MF_1_radius,float _MF_1_density,float _MF_1_turbulence,float _MF_1_lightDirection,float _MF_1_lightStrength,float _MF_1_temperature,float _MF_1_quality,float time){
 vec2 screen=(uv*2.-1.)*1.4;float t=time*_MF_1_speed;
 vec3 ro=vec3(screen,1.4),rd=vec3(0,0,-1),light=normalize(vec3(cos(_MF_1_lightDirection),.7,sin(_MF_1_lightDirection)));
 vec3 sum=vec3(0);float alpha=0.,steps=clamp(floor(_MF_1_quality),24.,96.),delta=2.8/steps;
 for(int i=0;i<96;i++){
  if(float(i)>=steps||alpha>.995)break;vec3 p=ro+rd*((float(i)+.5)*delta);
  float field=MF_graphic1_volumeDensity(p,kind,t,_MF_1_scale,_MF_1_radius,_MF_1_turbulence,time),rho=field*_MF_1_density;
  if(rho<.001)continue;
  float shadow=exp(-MF_graphic1_volumeDensity(p+light*.16,kind,t,_MF_1_scale,_MF_1_radius,_MF_1_turbulence,time)*_MF_1_lightStrength*1.5);
  float illumination=.25+_MF_1_lightStrength*.65*shadow,heat=clamp(field*_MF_1_temperature,0.,1.);
  vec3 tint;
  if(kind==2)tint=mix(vec3(.20,.23,.27),vec3(.75,.72,.65),clamp(_MF_1_temperature*.5,0.,1.))*illumination;
  else{tint=mix(vec3(.55,.045,.005),vec3(1.,.42,.025),heat);tint=mix(tint,vec3(1.,.92,.6),pow(heat,4.));tint*=.7+illumination*.5;if(kind==1)tint=mix(vec3(.18,.16,.15)*illumination,tint,1.-smoothstep(.3,.95,fract(t*.23+.12)));}
  float a=1.-exp(-rho*delta*3.);sum+=(1.-alpha)*tint*a;alpha+=(1.-alpha)*a;
 }
 return vec4(alpha>0.?sum/alpha:vec3(0),alpha);
}
vec4 MF_graphic1_generate(vec2 uv,float time){return MF_graphic1_volumeRender(uv,2,_MF_1_speed,_MF_1_scale,_MF_1_radius,_MF_1_density,_MF_1_turbulence,_MF_1_lightDirection,_MF_1_lightStrength,_MF_1_temperature,_MF_1_quality,time);}
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
