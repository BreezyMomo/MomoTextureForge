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
    float t = clamp((r - refP0) / max(1.2 - refP0, 0.01), 0.0, 1.0);
    return clamp(pow(t, max(refP1, 0.2)) * refP2, 0.0, 1.0);
