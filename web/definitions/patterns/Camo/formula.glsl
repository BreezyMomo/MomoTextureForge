vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_rot2(p, refP3) * max(refP0, 0.3);
    vec2 wp = ref_warp(q * 1.2, clamp(refP1, 0.0, 1.0) * 0.6, 1.0);
    float n = ref_fbmP(wp + vec2(2.3, 5.1), 4, 0.5);
    float c = clamp(refP2, 0.02, 0.6);
    float t = ref_smoothstep(0.5 - c, 0.5 + c, n);
    float lv = floor(max(refP4, 2.0));
    return clamp(floor(t * lv) / max(lv - 1.0, 1.0), 0.0, 1.0);
