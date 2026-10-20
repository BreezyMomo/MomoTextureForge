vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float x = abs(uv.x - 0.5);
    float y = clamp(uv.y, 0.0, 1.0);
    float bw = max(refP0, 0.008);
    float gw = max(refP1, bw + 0.02);
    float blade = 1.0 - ref_smoothstep(bw * 0.4, bw, x);
    float glow = 1.0 - ref_smoothstep(gw * 0.25, gw, x);
    float cap = max(refP2, 0.01);
    float ends = ref_smoothstep(0.0, cap, min(y, 1.0 - y));
    return clamp((blade + glow * 0.5) * ends * max(refP3, 0.05), 0.0, 1.0);
