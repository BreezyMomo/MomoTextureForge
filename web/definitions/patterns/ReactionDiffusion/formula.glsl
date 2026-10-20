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
    float a = ref_fbmP(q, 3, 0.5);
    float b = ref_fbmP(q * 2.7 + 11.0, 3, 0.5);
    float c = ref_fbmP(q * 5.3 + 23.0, 3, 0.5);
    float v = abs((a + b * 0.6) - c * 0.9);
    return clamp((v - refP1) * max(refP2, 0.5) + 0.5, 0.0, 1.0);
