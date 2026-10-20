vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = vec2(uv.x, uv.y * max(refP1, 0.05)) * refP0 + vec2(0.0, -time * 0.12);
    float v = ref_fbmP(ref_warp(q, 0.35, 1.0), int(refP3), 0.5);
    float rad = 1.0 - ref_smoothstep(0.05, max(refP2, 0.05), length(uv - 0.5));
    float up = ref_smoothstep(1.0, 0.3, uv.y);
    return clamp(v * rad * up * 2.0, 0.0, 1.0);
