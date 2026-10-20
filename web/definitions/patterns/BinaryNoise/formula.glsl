vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = vec2(uv.x * refP0, uv.y * refP0);
    vec2 ci = floor(q);
    vec2 c = fract(q) - 0.5;
    float scroll = floor(time * refP2 * 5.0);
    float on = step(1.0 - refP1, ref_hash1(ci + scroll));
    float bit = ref_hash1(ci + 9.9 + scroll);
    float ring = abs(length(c) - 0.3);
    float bar = abs(c.x * 1.5);
    float g = (bit < 0.5) ? (1.0 - ref_smoothstep(0.06, 0.1, ring))
                          : (1.0 - ref_smoothstep(0.05, 0.09, bar));
    return clamp(on * g * refP3, 0.0, 1.0);
