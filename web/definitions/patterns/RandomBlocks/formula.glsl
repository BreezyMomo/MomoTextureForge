vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0;
    vec2 ci = floor(q);
    vec2 c = fract(q);
    float on = step(1.0 - refP1, ref_hash1(ci));
    float d = max(abs(c.x - 0.5), abs(c.y - 0.5)) - (0.5 - refP2);
    return clamp(on * ref_fillD(d, 0.006), 0.0, 1.0);
