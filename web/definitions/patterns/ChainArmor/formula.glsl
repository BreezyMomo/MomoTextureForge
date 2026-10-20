vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = max(refP0, 3.0);
    vec2 g = uv * n;
    g.y += mod(floor(g.x), 2.0) * 0.5;
    vec2 f = fract(g) - 0.5;
    vec2 c1 = f - vec2(-0.25, 0.0), c2 = f - vec2(0.25, 0.0);
    float d = min(abs(length(c1) - refP1), abs(length(c2) - refP1));
    return ref_strokeD(d, refP2 * 0.5, 0.02);
