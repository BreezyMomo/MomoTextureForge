float r=length(q),wave=pow(1.-fract(r*a.x-time*a.y),max(a.z,.3));
float fade=b.x<.5?1.-smoothstep(a.w*.6,a.w*1.35,r):exp(-r/max(a.w,.001));return clamp(wave*fade,0.,1.);
