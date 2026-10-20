vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = vec2(uv.x, uv.y * 0.75) * refP0;
    float v1 = ref_fbmS(q + vec2(0.0, time * refP2 * 0.12), int(refP1), 0.5);
    float v2 = ref_fbmS(q * 1.9 + vec2(time * refP2 * 0.17, 7.3), 3, 0.5);
    float v = v1 * 0.65 + v2 * 0.35;
    return clamp((v * 0.5 + 0.5 - 0.38) * max(refP3, 0.2) * 2.4, 0.0, 1.0);
