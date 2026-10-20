vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float t = length((uv - 0.5) * vec2(1.0, 0.22)) ;
    float w = (ref_fbmP(uv * refP0, 4, 0.5) * 2.0 - 1.0) * refP2;
    float v = fract(t * refP1 + w);
    return pow(clamp(abs(v * 2.0 - 1.0), 0.0, 1.0), max(refP3, 0.2));
