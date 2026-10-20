vec3 v=periodicCells(u*R,R,W);float d=clamp(v.x,0.,1.);return mix(d,1.-d,N);
