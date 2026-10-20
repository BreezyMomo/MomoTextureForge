vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float v = ref_fbmP(uv * refP0, int(refP1), 0.5);
    float v2 = ref_fbmP(uv * refP0 * 4.3 + 7.0, 3, 0.5);
    float m = v * 0.65 + v2 * 0.35;
    return clamp((m - refP2) * max(refP3, 0.3) + 0.5, 0.0, 1.0);
