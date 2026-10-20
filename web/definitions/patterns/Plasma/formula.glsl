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
    float t = time * refP1;
    float v = sin(q.x * 6.28318530718 + t)
            + sin((q.y + q.x * 0.5) * 6.28318530718 + t * 1.31)
            + sin(length(q) * 6.28318530718 * 1.5 - t * 0.87)
            + sin(sqrt(length(q) + 0.5) * 6.28318530718 * 2.0 + t * 0.53);
    v = clamp(v * 0.25 + 0.5, 0.0, 1.0);
    return pow(v, max(refP2, 0.2));
