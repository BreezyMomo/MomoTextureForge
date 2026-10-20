vec3 v=periodicCells(u*R,R,W);return pow(clamp(1.-(v.y-v.x),0.,1.),max(N,.2));
