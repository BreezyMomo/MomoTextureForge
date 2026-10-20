vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float v = ref_ridged(uv * refP0, int(refP1), 0.5);
    float v2 = ref_fbmP(uv * refP0 * 2.3, 3, 0.5);
    float m = v * 0.75 + v2 * 0.25;
    return clamp((m - refP3) * max(refP2, 0.3) + 0.5, 0.0, 1.0);
