vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = ref_fbmP(p * refP2, 4, 0.5) * 2.0 - 1.0;
    float rr = refP0 + n * refP1;
    return ref_fillD(length(p) - rr, refP3);
