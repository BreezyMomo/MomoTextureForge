vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0 * vec2(1.0, max(1.0 - refP1, 0.05));
    float f = ref_vnoise(q) * 0.6 + ref_vnoise(q * 2.6 + 3.1) * 0.3 + ref_hash1(floor(uv * 300.0)) * 0.1;
    float blotch = ref_fbmP(uv * 3.5, 4, 0.5);
    float v = refP3 + (f - 0.5) * 0.5 + (blotch - 0.5) * refP2 * 0.6;
    return clamp(v, 0.0, 1.0);
