vec3 v=periodicCells(u*R,R,max(S,.2));return pow(mix(clamp(v.x,0.,1.),clamp(v.y-v.x,0.,1.),clamp(N,0.,1.)),max(W,.25));
