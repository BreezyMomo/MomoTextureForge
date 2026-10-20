float radial=ref_fillD(length(q)-a.x,a.w);float start=radians(a.y),span=radians(a.z),feather=radians(b.x);
float angle=atan(q.y,q.x),delta=abs(mod(angle-start-span*.5+3.14159265359,6.28318530718)-3.14159265359);
float edge=max(feather,length(fwidth(q))/max(length(q),.0001));float sector=1.-smoothstep(span*.5-edge,span*.5+edge,delta);
if(span>=6.28318)sector=1.;if(span<=0.)sector=0.;return radial*sector;
