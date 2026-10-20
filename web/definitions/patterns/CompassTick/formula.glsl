float n=floor(max(a.x,4.)),seg=6.28318530718/n,angle=atan(q.y,q.x);
float index=mod(floor(angle/seg+.5),n),axis=index*seg;
vec2 p=vec2(dot(q,vec2(cos(axis),sin(axis))),dot(q,vec2(-sin(axis),cos(axis))));
float major=1.-step(.5,mod(index,max(floor(a.y),1.))),len=a.w*mix(.5,1.,major);
return ref_fillD(ref_sdBox(vec2(p.x-a.z-len*.5,p.y),vec2(len*.5,b.x*.5)),.002);
