vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = vec2(uv.x * refP0, uv.y * refP0 / max(refP1 * 4.0, 0.5));
    float s = ref_vnoise(q) * 0.6 + ref_vnoise(q * 3.7) * 0.25 + ref_vnoise(q * 11.0) * 0.15;
    float scr = ref_smoothstep(0.97 - refP3 * 0.25, 1.0, ref_vnoise(q * 0.4 + 9.1));
    float v = 0.5 + (s - 0.5) * refP2 * 2.0 + scr * 0.35;
    return clamp(v, 0.0, 1.0);
