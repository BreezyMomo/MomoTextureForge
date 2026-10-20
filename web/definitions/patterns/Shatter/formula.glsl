// Voronoi fragments: color and boundary use the same nearest seed.
float density=max(a.x,1.);
vec2 pos=q*density*.5, cell=floor(pos), local=fract(pos);
float nearest=1e5;vec2 nearestSeed=vec2(0.),seedId=vec2(0.);
for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
 vec2 offset=vec2(x,y), id=cell+offset;
 vec2 seed=offset+.5+(ref_hash2(id)-.5)*a.z;
 float dist=dot(seed-local,seed-local);
 if(dist<nearest){nearest=dist;nearestSeed=seed;seedId=id;}
}
float edge=1e5;
for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){
 vec2 offset=vec2(x,y),id=cell+offset;
 vec2 seed=offset+.5+(ref_hash2(id)-.5)*a.z;
 vec2 delta=seed-nearestSeed;
 if(dot(delta,delta)>.00001)edge=min(edge,dot((seed+nearestSeed)*.5-local,normalize(delta)));
}
float gap=.025+max(a.y,0.)*.055;
float aa=max(fwidth(edge)*.5,.003);
float fragment=smoothstep(gap-aa,gap+aa,edge);
float radius=.72+max(a.y,0.)*.06;
float extent=1.-smoothstep(radius-.025,radius+.025,length(q));
return fragment*extent*(.55+.45*ref_hash1(seedId));
