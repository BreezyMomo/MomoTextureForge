vec2 c=fract(u*R);float edge=min(min(c.x,1.-c.x),min(c.y,1.-c.y));
float warp=(periodicFractal(u,max(1.,floor(R*N+.5)),3,.5,0.,0.)-.5)*S;
float width=clamp(W,.004,.5)*.5/R;
return 1.-smoothstep(width-.002,width+.002,(edge+warp)/R);
