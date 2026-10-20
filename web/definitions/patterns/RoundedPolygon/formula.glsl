// Euclidean distance to an inset convex polygon, then round its corners.
vec2 p=ref_rot2(q,-a.w);float n=floor(max(a.x,3.)),radius=max(a.y,.01);
float corner=clamp(a.z,0.,radius),core=max(radius-corner,.00001),seg=6.28318530718/n;
float dist=1e6;bool inside=true;
for(int i=0;i<64;i++){if(float(i)>=n)break;float t=seg*float(i);vec2 v0=core*vec2(cos(t),sin(t)),v1=core*vec2(cos(t+seg),sin(t+seg));
vec2 edge=v1-v0,rel=p-v0;float t0=clamp(dot(rel,edge)/max(dot(edge,edge),1e-12),0.,1.);dist=min(dist,length(rel-edge*t0));if(edge.x*rel.y-edge.y*rel.x<0.)inside=false;}
return ref_fillD((inside?-dist:dist)-corner,.006);
