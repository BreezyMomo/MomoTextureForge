vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float rr = length(p);
    float core = ref_fillD(rr - refP0, 0.01);
    float a = atan(p.y, p.x);
    float spike = pow(abs(cos(a * floor(max(refP1, 3.0)) * 0.5)), 2.2);
    float sl = refP0 * (0.7 + refP2 * spike);
    float star = ref_fillD(rr - sl, 0.008);
    float glow = exp(-pow(rr / (refP0 * 1.7), 2.0)) * refP3;
    return clamp(max(max(core, star), glow), 0.0, 1.0);
