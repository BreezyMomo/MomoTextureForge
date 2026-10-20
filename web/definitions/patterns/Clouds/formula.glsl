vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_warp(uv * refP0 + vec2(0.0, time * 0.02), refP4, 1.0);
    float v = ref_billow(q, int(refP1), 0.5);
    float y0 = clamp(refP2, 0.0, 0.85);
    float y1 = max(y0 + 0.3, 0.9);
    float mask = min(ref_smoothstep(y0, y0 + 0.25, uv.y),
                     1.0 - ref_smoothstep(y1 - 0.25, y1, uv.y));
    return clamp((v * mask - 0.18) * max(refP3, 0.2) * 2.4, 0.0, 1.0);
