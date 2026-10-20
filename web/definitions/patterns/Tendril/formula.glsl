vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_warp(uv * refP0, refP3, 1.0);
    float v = ref_ridged(q, int(refP1), 0.5);
    return ref_smoothstep(1.0 - max(refP2, 0.01), 1.0, v);
