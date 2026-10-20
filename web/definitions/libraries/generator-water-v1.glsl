vec4 generate(vec2 uv){
 vec2 p=uv*scale;float t=time*speed,first=10.,second=10.;
 vec2 cell=floor(p),f=fract(p);
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 g=vec2(x,y);vec2 phases=vec2(motionHash(vec3(cell+g,1)),motionHash(vec3(cell+g,2)))*6.283185;
  vec2 point=.5+.4*sin(phases+t);float d=length(g+point-f);
  if(d<first){second=first;first=d;}else second=min(second,d);
 }
 float edge=exp(-(second-first)*sharpness);
 float ripple=.5+.5*sin(first*18.-t*2.);
 vec3 c=mix(vec3(.015,.08,.16),vec3(.04,.5,.66),ripple*.5+edge*.5);
 c+=vec3(.45,.8,.95)*edge*intensity;
 return vec4(c,1.);
}
