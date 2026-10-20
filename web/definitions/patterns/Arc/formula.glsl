vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float x = uv.x - 0.5;
    float conf = 1.0 - abs(x) * 2.0;
    float off = (ref_fbmP(vec2(uv.x * refP1, 4.7 + time * 0.6), 4, 0.5) * 2.0 - 1.0) * refP0 * max(conf, 0.0);
    float bow = 0.055 * (1.0 - (x * 2.0) * (x * 2.0));
    float d = abs(uv.y - 0.5 - bow - off);
    float v = 1.0 - ref_smoothstep(refP2 - 0.004, refP2 + 0.004, d);
    float brk = step(refP3, ref_hash1(vec2(floor(uv.x * 22.0), floor(time * 9.0))));
    return clamp(v * mix(1.0, brk, 0.8), 0.0, 1.0);
