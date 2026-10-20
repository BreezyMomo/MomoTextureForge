vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * vec2(refP0, refP0);
    q.y += mod(floor(q.x), 2.0) * refP2;
    vec2 c = fract(q) - vec2(0.0, 0.5);
    vec2 a = vec2(-0.36, 0.42), b = vec2(0.0, -0.12), e = vec2(0.36, 0.42);
    float d = min(ref_sdSeg(c, a, b), ref_sdSeg(c, b, e)) - refP1;
    return ref_fillD(d, 0.006);
