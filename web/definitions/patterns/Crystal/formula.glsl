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
    vec2 c = fract(q) - 0.5;
    float a = ref_hash1(ci) * 3.14159265359;
    vec2 r = ref_rot2(c, a);
    float band = 1.0 - ref_smoothstep(0.0, max(refP1, 0.005),
                   abs(fract(r.y * max(refP2, 1.0)) - 0.5));
    float edge = ref_smoothstep(0.5 - max(refP3, 0.005), 0.5, max(abs(c.x), abs(c.y)));
    return clamp(band * (1.0 - edge), 0.0, 1.0);
