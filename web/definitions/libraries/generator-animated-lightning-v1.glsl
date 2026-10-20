float boltCurve(float y,float t,float branch){return .5+(motionFbm(vec3(y*scale,branch*13.,t))-.48)*wander+sin(y*18.+t*3.+branch)*.025;}
vec4 generate(vec2 uv){
 float t=time*speed,energy=0.;
 for(int i=0;i<6;i++){
  if(float(i)>branches)break;float b=float(i);
  float start=.25+b*.09;
  float shift=i==0?0.:(uv.y-start)*(mod(b,2.)<1.?1.:-1.)*.7;
  float d=abs(uv.x-boltCurve(uv.y,t,b*.08)-shift);
  float gate=i==0?1.:smoothstep(start,start+.04,uv.y)*(1.-smoothstep(.8,1.,uv.y));
  energy+=gate*(exp(-d/max(.0005,thickness))+exp(-d/max(.001,glow))*.18);
 }
 float flicker=.72+.28*sin(t*17.+seed);
 float a=clamp(energy*flicker*intensity,0.,1.)*smoothstep(0.,.03,uv.y)*(1.-smoothstep(.97,1.,uv.y));
 return vec4(mix(vec3(.12,.35,1.),vec3(.9,.97,1.),clamp(energy,0.,1.))*intensity,a);
}
