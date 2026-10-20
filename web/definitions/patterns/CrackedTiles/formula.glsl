vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0;
    vec2 c = fract(q);
    float e = min(min(c.x, 1.0 - c.x), min(c.y, 1.0 - c.y));
    float ref_warp = (ref_fbmP(q * refP2, 3, 0.5) - 0.5) * refP3;
    float d = (e + ref_warp) / max(refP0, 1.0);
    float sw = clamp(refP1, 0.004, 0.5) * 0.5 / max(refP0, 1.0);
    return 1.0 - ref_smoothstep(sw - 0.002, sw + 0.002, d);
