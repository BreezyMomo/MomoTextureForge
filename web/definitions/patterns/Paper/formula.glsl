vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float fib = ref_fbmP(uv * refP0 * vec2(1.0, 14.0), 4, 0.5);
    float bump = ref_fbmP(uv * refP0 * 0.45, 3, 0.5);
    return clamp(0.58 + (fib - 0.5) * max(refP1, 0.02) * 2.0
                      + (bump - 0.5) * max(refP2, 0.02) * 1.6, 0.0, 1.0);
