vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_rot2(uv - 0.5, refP1) + 0.5;
    float g1 = 0.5 + 0.5 * sin(uv.x * refP0 * 6.28318530718);
    float g2 = 0.5 + 0.5 * sin(q.x * refP0 * (1.0 + refP2) * 6.28318530718);
    return clamp(pow(max(g1 * g2 * 4.0 - 0.15, 0.0), max(refP3, 0.2)) * 1.05, 0.0, 1.0);
