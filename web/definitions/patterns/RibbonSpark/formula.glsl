vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float dens = max(refP0, 8.0);
    vec2 q = vec2(uv.x, uv.y * 2.0) * dens;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float on = step(0.70, ref_hash1(id + 9.3));
    float flick = step(0.5, ref_hash1(id + floor(time * max(refP1, 0.0)) * 1.7 + 4.9));
    float r = max(refP2, 0.03);
    float d = length(f - (ref_hash2(id + 2.1) - 0.5) * 0.55);
    float sp = (1.0 - ref_smoothstep(r * 0.4, r, d)) * on;
    return clamp(sp * mix(1.0, flick, 0.55)
                 * pow(clamp(uv.y, 0.0, 1.0), max(refP3, 0.05)) * 2.6, 0.0, 1.0);
