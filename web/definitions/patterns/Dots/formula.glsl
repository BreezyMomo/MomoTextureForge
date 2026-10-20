vec2 p=u*N;float row=floor(p.y);p.x-=mod(row,2.)*b.x;
return fill(length(fract(p)-.5)-R*.45,S);
