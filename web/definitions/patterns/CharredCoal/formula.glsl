vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * max(refP0, 2.0);
    float n = ref_fbmV(q, 4, 0.55);
    float blk = ref_turb(q * 0.6, 3);
    float crack = 1.0 - ref_smoothstep(0.0, max(refP1, 0.015), abs(n - refP2));
    float body = ref_smoothstep(0.22, 0.78, blk) * refP3;
    return clamp(body * 0.75 + crack * 0.7, 0.0, 1.0);
