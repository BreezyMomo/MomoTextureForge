float dist=gearDistance(q,N,R,D,K,H);
if(c.x>=.5){float profile=pow(.5+.5*cos(atan(q.y,q.x)*floor(N)),c.y);dist=r-(R-D+D*profile);}
return fill(dist,S)*(W<=0.?1.:1.-fill(r-W,S));
