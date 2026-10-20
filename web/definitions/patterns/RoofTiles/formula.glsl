vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * vec2(refP0, refP1);
    q.x += mod(floor(q.y), 2.0) * 0.5;
    vec2 c = fract(q);
    float rect = ref_sdBox(vec2(c.x - 0.5, c.y - 0.75), vec2(0.47, 0.25));
    float cap = length(vec2(c.x - 0.5, c.y - 0.5)) - 0.47;
    float d = (min(rect, cap) - clamp(refP2, 0.004, 0.1)) / max(min(refP0, refP1), 1.0);
    return ref_fillD(d, 0.003);
