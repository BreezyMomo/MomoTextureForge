vec3 v=periodicCells(u*R,R,W);return clamp((v.y-v.x)/max(v.y,.0001)/max(N,.01),0.,1.);
