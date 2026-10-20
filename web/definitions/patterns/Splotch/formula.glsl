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
    vec2 ci = floor(q);
    vec2 c = fract(q) - 0.5;
    float r = refP1 * (0.35 + 0.65 * ref_hash1(ci + 5.1));
    vec2 o = (ref_hash2(ci + 9.7) - 0.5) * 0.45;
    float n = (ref_fbmP(c * 5.0 + ci * 3.0, 3, 0.5) - 0.5) * refP2;
    float d = length(c - o) - r * (1.0 + n * 1.6);
    return ref_fillD(d, 0.006) * step(1.0 - max(refP3, 0.02), ref_hash1(ci));
