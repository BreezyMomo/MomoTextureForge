vec4 generate(vec2 uv){
 float y=uv.y/baseHeight,t=time*speed;
 vec2 p=vec2((uv.x-.5)/width,y);
 float n=motionFbm(vec3(p.x*scale,y*scale-t,t*.2));
 float sway=(motionNoise(vec3(y*3.,t*.4,seed))-.5)*turbulence*y;
 float taper=max(.04,1.-y*.85);
 float fuel=1.-abs(p.x+sway)/taper-y*.65+(n-.45)*turbulence;
 float a=smoothstep(.0,.22,fuel)*smoothstep(0.,.04,uv.y)*(1.-smoothstep(.9,1.,y));
 float heat=clamp(fuel*1.5,0.,1.);
 vec3 c=mix(vec3(.8,.035,.003),vec3(1.,.4,.02),heat);
 c=mix(c,vec3(1.,.93,.55),pow(heat,3.))*intensity;
 return vec4(c,a);
}
