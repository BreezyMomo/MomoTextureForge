vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * vec2(refP0 * 0.6, refP0);
    float w = (ref_fbmP(uv * refP0 * 0.6, 3, 0.5) - 0.5) * refP1;
    float v = 0.5 + 0.5 * sin((q.y + w) * 6.28318530718 * 0.5 * refP2);
    return pow(v, max(refP3, 0.2));
