vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = max(floor(refP0), 4.0);
    float segs = max(floor(refP2), 4.0);
    float col = floor(uv.x * n);
    float lvl = 0.15 + 0.80 * ref_hash1(vec2(col, floor(time * max(refP1, 0.1)) + 1.3));
    float on = 1.0 - step(lvl, uv.y);
    float gx = 1.0 - ref_smoothstep(0.40, 0.50, abs(fract(uv.x * n) - 0.5));
    float gy = 1.0 - ref_smoothstep(0.35, 0.50, abs(fract(uv.y * segs) - 0.5));
    return clamp(on * gx * gy * refP3, 0.0, 1.0);
