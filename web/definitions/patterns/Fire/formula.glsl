vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = vec2(uv.x, uv.y * max(refP1, 0.05)) * refP0;
    q.y += time * 0.35;
    float v = ref_fbmP(ref_warp(q, 0.4, 1.0), int(refP2), 0.5);
    float shape = pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.5);
    float vv = pow(clamp(v, 0.0, 1.0), 1.0 + shape * 2.5);
    return clamp(vv * shape * max(refP3, 0.2) * 3.2, 0.0, 1.0);
