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
    float n = ref_hash1(floor(q));
    float dot_ = 1.0 - ref_smoothstep(0.0, max(refP2, 0.01), length(fract(q) - 0.5));
    return clamp(step(1.0 - max(refP1, 0.001), n) * dot_, 0.0, 1.0);
