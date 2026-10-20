float n=floor(max(a.x,1.)),pitch=a.y/n;float body=ref_sdBox(q+vec2(0,a.z*.5),vec2(a.y*.5,a.z*.5));
// Finite trapezoids overlap the base; no independently antialiased internal seams.
float d=body;
for(int i=0;i<32;i++){if(float(i)>=n)break;vec2 p=q-vec2(-a.y*.5+(float(i)+.5)*pitch,0.);
vec2 v0=vec2(-pitch*b.x*.5,-.002),v1=vec2(pitch*b.x*.5,-.002),v2=vec2(pitch*b.x*b.y*.5,a.w),v3=vec2(-pitch*b.x*b.y*.5,a.w);
float edge=min(min(ref_sdSeg(p,v0,v1),ref_sdSeg(p,v1,v2)),min(ref_sdSeg(p,v2,v3),ref_sdSeg(p,v3,v0)));
float halfWidth=mix(pitch*b.x*.5,pitch*b.x*b.y*.5,clamp((p.y+.002)/(a.w+.002),0.,1.));bool inside=p.y>=-.002&&p.y<=a.w&&abs(p.x)<=halfWidth;d=min(d,inside?-edge:edge);}
return ref_fillD(d,b.z);
