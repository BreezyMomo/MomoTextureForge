vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = ref_ridged(uv * refP0, int(refP1), 0.55);
    float pores = ref_smoothstep(refP2, refP2 + 0.18, r);
    return pow(clamp(pores, 0.0, 1.0), max(refP3, 0.2));
