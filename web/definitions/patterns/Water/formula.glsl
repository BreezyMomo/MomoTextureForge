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
    float w = sin((q.x + q.y * 0.6) * 1.7 + t) * refP2;
    float v = 0.5 + 0.5 * sin(q.y * 6.28318530718 * 1.1 + w * 6.28318530718 + t * 1.2);
    float v2 = 0.5 + 0.5 * sin(q.x * 6.28318530718 * 1.6 - w * 6.28318530718 + t * 0.9);
    return clamp(pow(max(v, v2), max(refP3, 0.2)), 0.0, 1.0);
