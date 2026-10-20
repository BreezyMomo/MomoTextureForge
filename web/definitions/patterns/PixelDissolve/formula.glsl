vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 g = floor(uv * max(refP0, 2.0));
    float h = ref_hash1(g + 7.31);
    float t = clamp(refP1 + (length(uv - 0.5) * 2.0 - 0.5) * refP2, 0.0, 1.0);
    return ref_sstepW(t, refP3, h);
