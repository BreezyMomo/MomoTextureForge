float angle=atan(q.y,q.x)-radians(a.x)-a.z*length(q);
if(b.x>=.5)angle=-angle;float t=mod(angle,6.28318530718)/max(radians(a.y),.0001);return pow(clamp(t,0.,1.),a.w);
