vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float row = floor(uv.y * refP0);
    float r = ref_hash1(vec2(row, 3.3));
    float len = 0.12 + 0.88 * ref_hash1(vec2(row, 6.6)) * refP1;
    float x0 = fract(ref_hash1(vec2(row, 9.9)) + time * refP3 * 0.35);
    float x = fract(uv.x - x0);
    float on = step(x, len) * step(0.55, r);
    float th = max(refP2, 0.01) / max(refP0, 1.0) * 0.5;
    float line = 1.0 - ref_smoothstep(th, th + 0.006, abs(fract(uv.y * refP0) - 0.5) / max(refP0, 1.0));
    return clamp(on * line * (0.4 + 0.6 * r), 0.0, 1.0);
