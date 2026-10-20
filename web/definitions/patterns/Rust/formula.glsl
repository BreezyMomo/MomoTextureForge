vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float v = ref_fbmP(uv * refP0, int(refP2), 0.5);
    float v2 = ref_fbmP(uv * refP0 * 3.7 + 13.0, 4, 0.5);
    float m = clamp((v * 0.7 + v2 * 0.3 - refP1) * 3.2, 0.0, 1.0);
    return clamp(m * (0.55 + 0.45 * v2), 0.0, 1.0);
