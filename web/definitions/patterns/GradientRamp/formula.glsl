vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    int s = int(floor(refP3 + 0.5));
    float src;
    if(s == 0)      src = clamp(length(p) * 0.8, 0.0, 1.0);
    else if(s == 1) src = clamp(uv.x, 0.0, 1.0);
    else            src = ref_fbmP(uv * 5.0, 4, 0.5);
    float v = clamp((src - refP0) / max(refP1 - refP0, 0.01), 0.0, 1.0);
    return pow(v, max(refP2, 0.05));
