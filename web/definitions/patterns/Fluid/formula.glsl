vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_warp(uv * refP0 + time * 0.05, refP1, 1.0);
    float v = ref_fbmP(q, int(refP3), 0.5);
    return clamp((v - 0.5) * max(refP2, 0.1) + 0.5, 0.0, 1.0);
