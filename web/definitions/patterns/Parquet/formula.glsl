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
    vec2 ci = floor(q * 0.5);
    vec2 lf = fract(q * 0.5) - 0.5;
    float idx = mod(ci.x + ci.y * 3.0, 4.0);
    float a = idx * 3.14159265359 * 0.5 * refP2;
    vec2 r = ref_rot2(lf, a);
    float d = (0.5 - max(abs(r.x), abs(r.y))) / max(refP0, 1.0);
    float sw = clamp(refP1, 0.004, 0.5) * 0.5 / max(refP0, 1.0);
    return 1.0 - ref_smoothstep(sw - 0.002, sw + 0.002, d);
