vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = ref_hash1(floor(uv * refP0));
    return clamp((n - 0.5) * max(refP1, 0.05) + 0.5, 0.0, 1.0);
