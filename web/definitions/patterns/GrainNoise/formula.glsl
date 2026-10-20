vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * max(refP0, 8.0);
    float g1 = ref_hash1(floor(q) + 0.7);
    float g2 = ref_hash1(floor(q * 0.5) + 13.1);
    float grain = mix(g1, g2, clamp(refP2, 0.0, 1.0));
    float modu = 0.45 + 0.55 * ref_fbmP(uv * max(refP3, 0.5), 3, 0.5);
    return clamp(grain * modu * refP1 * 1.8, 0.0, 1.0);
