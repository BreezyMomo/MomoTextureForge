vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * vec2(max(refP0, 1.0) * 1.6, max(refP0, 1.0) * 0.5);
    q.x += time * refP1 * 0.35;
    float n1 = ref_fbmS(q, 4, 0.55);
    float n2 = ref_fbmS(q * 1.7 + 3.3, 3, 0.55);
    float curtain = 0.5 + 0.5 * sin((uv.y * refP2 + n1 * 3.0 + n2 * 1.5) * 6.28318530718);
    float v = pow(clamp(curtain, 0.0, 1.0), max(refP3, 0.4));
    return clamp(v * (0.55 + 0.45 * n1) * 1.5, 0.0, 1.0);
