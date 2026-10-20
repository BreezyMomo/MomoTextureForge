float angle=atan(q.y,q.x),r=length(q),n=2.*floor(max(a.x,4.)*.5);
float rays=pow(clamp((.5+.5*cos(angle*n))*(1.-a.y*(.5-.5*cos(angle*n*.5))),0.,1.),max(a.w,.3));
float fade=1.-smoothstep(max(a.z,.05)*.35,max(a.z,.05),r);float core=1.-smoothstep(0.,.14,r);return clamp(rays*fade+core*.95,0.,1.);
