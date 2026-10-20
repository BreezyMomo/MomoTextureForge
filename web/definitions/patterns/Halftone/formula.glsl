vec2 grid=ref_rot2(u-.5,a.z)*a.x,cell=floor(grid),local=fract(grid)-.5;
// Evaluate the source at the dot centre so dots remain circular.
vec2 center=ref_rot2((cell+.5)/max(a.x,1.),-a.z)+.5;
float src=b.x<.5?clamp(1.-length((center-b.yz)*2.)/max(a.w,.01),0.,1.):b.x<1.5?clamp(.5+(center.x-b.y)/max(a.w,.01),0.,1.):ref_fbmP(cell*.23+4.7,4,.5);
float radius=a.y*sqrt(src);return radius<=0.?0.:ref_fillD(length(local)-radius,.006);
