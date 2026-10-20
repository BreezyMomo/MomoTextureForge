vec3 v=periodicCells(u*R,R,W);return 1.-smoothstep(0.,max(N,.0001),v.y-v.x);
