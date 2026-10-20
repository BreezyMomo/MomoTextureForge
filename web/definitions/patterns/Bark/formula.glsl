vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * vec2(refP0 * 0.55, refP0 * 2.4);
    float r1 = ref_ridged(q, int(refP1), 0.55);
    float r2 = ref_ridged(ref_warp(q, refP2, 0.8), int(refP1), 0.55);
    return clamp(pow(max(r1 * 0.5 + r2 * 0.5, 0.0), max(refP3, 0.2)) * 1.15, 0.0, 1.0);
