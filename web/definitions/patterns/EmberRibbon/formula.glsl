vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = vec2(uv.x, uv.y * 2.2) * max(refP0, 8.0);
    q.y += time * max(refP2, 0.0) * 0.6;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float on = step(0.80, ref_hash1(id + 6.1));
    float r = max(refP1, 0.03);
    float d = length(f - (ref_hash2(id + 3.3) - 0.5) * 0.62);
    float sp = (1.0 - ref_smoothstep(r * 0.45, r, d)) * on;
    return clamp(sp * pow(clamp(uv.y, 0.0, 1.0), max(refP3, 0.05)) * 3.4, 0.0, 1.0);
