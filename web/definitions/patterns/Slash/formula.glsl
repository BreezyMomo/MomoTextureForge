vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_rot2(p, -refP3);
    float t = clamp(abs(q.x) / max(refP2, 0.01), 0.0, 1.0);
    float w = refP1 * (1.0 - t * t);
    float d = abs(q.y - refP0 * q.x * q.x * 0.45) - w;
    return ref_fillD(d, 0.005);
