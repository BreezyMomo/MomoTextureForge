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
    vec2 c = fract(q) - 0.5;
    float over = mod(floor(q.x) + floor(q.y), 2.0);
    float w = max(refP1, 0.01) * 0.5;
    float hx = 1.0 - ref_smoothstep(w, w + 0.006, abs(c.y));
    float vy = 1.0 - ref_smoothstep(w, w + 0.006, abs(c.x));
    float a = (over < 0.5) ? hx : vy;
    float b = (over < 0.5) ? vy : hx;
    return clamp(a * (1.0 - b * 0.85) + a * 0.12, 0.0, 1.0);
