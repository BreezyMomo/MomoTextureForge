vec2 warp=vec2(periodicFractal(u,R,3,.5,0.,0.),periodicFractal(u,R,3,.5,9.3,0.))*S;
vec3 v=periodicCells(u*R+warp,R,.9);float crack=1.-smoothstep(0.,max(W,.015),v.y-v.x);
return clamp(crack+(.45+.55*v.z)*(1.-crack)*N,0.,1.);
