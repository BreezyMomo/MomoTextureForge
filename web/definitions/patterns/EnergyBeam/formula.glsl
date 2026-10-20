vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float y = abs(p.y);
    float core = 1.0 - ref_smoothstep(refP0 * refP1, refP0 * refP1 + 0.006, y);
    float glow = exp(-pow(y / max(refP0, 0.005), 2.0));
    float outer = 1.0 - ref_smoothstep(refP0 * (1.0 + refP2), refP0 * (1.0 + refP2) + refP3, y);
    return clamp(max(max(core, glow * 0.9), outer * 0.55), 0.0, 1.0);
