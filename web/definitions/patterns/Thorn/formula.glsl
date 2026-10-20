vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float a = atan(p.y, p.x) + refP3;
    float k = max(refP2, 1.0);
    float shape = (k < 1.5) ? 1.0 : (0.55 + 0.45 * abs(cos(a * k * 0.5)));
    float rr = refP0 * shape;
    float t = clamp(1.0 - length(p) / max(rr, 0.001), 0.0, 1.0);
    return pow(t, max(refP1, 1.0));
