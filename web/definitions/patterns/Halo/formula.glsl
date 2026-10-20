vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = length(p);
    float v = exp(-pow((r - refP0) / max(refP1, 0.005), 2.0));
    return clamp(v * refP2, 0.0, 1.0);
