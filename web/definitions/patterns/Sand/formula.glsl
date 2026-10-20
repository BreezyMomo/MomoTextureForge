vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float grain = ref_hash1(floor(uv * refP1));
    float wave = ref_fbmP(ref_warp(uv * refP0, 0.18, 1.0), 4, 0.5);
    return clamp(mix(0.5, wave, refP2) * 0.72 + grain * 0.28, 0.0, 1.0);
