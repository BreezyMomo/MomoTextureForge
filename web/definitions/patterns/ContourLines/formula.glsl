vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * max(refP0, 1.0);
    float h = ref_fbmP(ref_warp(q, refP2, 0.6), 4, 0.5);
    float d = abs(fract(h * refP1) - 0.5) * 2.0;
    return clamp(1.0 - ref_smoothstep(0.0, max(refP3, 0.01), d), 0.0, 1.0);
