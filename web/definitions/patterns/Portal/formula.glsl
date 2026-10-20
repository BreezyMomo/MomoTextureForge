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
    float a = atan(p.y, p.x);
    float R = max(refP0, 0.05);
    float ang = a + (1.0 - clamp(r / R, 0.0, 1.0)) * refP1 + time * refP2;
    float n = ref_fbmP(vec2(cos(ang), sin(ang)) * 1.6 + r * 3.0, 4, 0.5);
    float inside = ref_fillD(r - R, 0.008) * (0.25 + 0.75 * n);
    float ring = ref_fillD(abs(r - R) - refP3 * 0.5, 0.006);
    return clamp(max(inside, ring), 0.0, 1.0);
