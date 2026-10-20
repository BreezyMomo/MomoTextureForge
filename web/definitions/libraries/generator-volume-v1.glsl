// Bounded front-to-back volume integration. Density and lighting share seeded noise.
float volumeDensity(vec3 p,int kind,float t,float scale,float radius,float turbulence){
 vec3 q=p*scale;float phase=fract(t*.23+.12);
 if(kind==0)q.y-=t*2.;else if(kind==2)q.y-=t*.5;else q/=max(.3,.5+phase);
 float noise=motionFbm(q+vec3(0,0,t*.17));
 if(kind==0){
  float y=(p.y+.9)/1.8,width=max(.03,radius*.65*(1.-y*.85));
  float inside=1.-length(p.xz+vec2((noise-.5)*.18*turbulence,0))/width-y*.6+(noise-.5)*turbulence;
  return smoothstep(0.,.4,inside)*smoothstep(0.,.08,y)*(1.-smoothstep(.9,1.,y))*(.4+noise);
 }
 float extent=kind==1?radius*(.25+phase*.85):radius;
 float envelope=length(p/vec3(extent,extent*(kind==2?1.1:1.),extent));
 float density=(1.-smoothstep(.4,1.,envelope+(noise-.5)*turbulence))*(.25+noise*.75);
 if(kind==1)density*=smoothstep(0.,.07,phase)*(1.-smoothstep(.55,1.,phase));
 return density;
}
vec4 volumeRender(vec2 uv,int kind,float speed,float scale,float radius,float density,float turbulence,float lightDirection,float lightStrength,float temperature,float quality){
 vec2 screen=(uv*2.-1.)*1.4;float t=time*speed;
 vec3 ro=vec3(screen,1.4),rd=vec3(0,0,-1),light=normalize(vec3(cos(lightDirection),.7,sin(lightDirection)));
 vec3 sum=vec3(0);float alpha=0.,steps=clamp(floor(quality),24.,96.),delta=2.8/steps;
 for(int i=0;i<96;i++){
  if(float(i)>=steps||alpha>.995)break;vec3 p=ro+rd*((float(i)+.5)*delta);
  float field=volumeDensity(p,kind,t,scale,radius,turbulence),rho=field*density;
  if(rho<.001)continue;
  float shadow=exp(-volumeDensity(p+light*.16,kind,t,scale,radius,turbulence)*lightStrength*1.5);
  float illumination=.25+lightStrength*.65*shadow,heat=clamp(field*temperature,0.,1.);
  vec3 tint;
  if(kind==2)tint=mix(vec3(.20,.23,.27),vec3(.75,.72,.65),clamp(temperature*.5,0.,1.))*illumination;
  else{tint=mix(vec3(.55,.045,.005),vec3(1.,.42,.025),heat);tint=mix(tint,vec3(1.,.92,.6),pow(heat,4.));tint*=.7+illumination*.5;if(kind==1)tint=mix(vec3(.18,.16,.15)*illumination,tint,1.-smoothstep(.3,.95,fract(t*.23+.12)));}
  float a=1.-exp(-rho*delta*3.);sum+=(1.-alpha)*tint*a;alpha+=(1.-alpha)*a;
 }
 return vec4(alpha>0.?sum/alpha:vec3(0),alpha);
}
