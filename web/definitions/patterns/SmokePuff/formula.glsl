vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float rr = refP0 + (ref_fbmP(p * refP2, 4, 0.5) * 2.0 - 1.0) * refP1;
    float shape = ref_fillD(length(p) - rr, 0.012);
    float dens = ref_fbmP(p * refP2 * 1.7 + 7.0, 4, 0.5);
    return clamp(shape * mix(1.0, dens, refP3) * 1.25, 0.0, 1.0);
