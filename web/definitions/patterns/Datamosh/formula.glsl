vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = max(refP0, 4.0);
    float row = floor(uv.y * n);
    float j = ref_hash1(vec2(row, floor(time * refP2) * 0.37));
    float tear = step(1.0 - refP1, ref_hash1(vec2(row * 3.1, floor(time * refP2 * 2.0)))) * (ref_hash1(vec2(row, 5.5)) - 0.5) * 0.5;
    float v = step(ref_hash1(vec2(row, j * 9.0)), 0.35 + refP3 * 0.3);
    float bar = step(abs(fract(uv.x * (2.0 + floor(j * 6.0)) + tear) - 0.5), 0.25);
    return clamp(v * bar * 0.9 + v * 0.1, 0.0, 1.0);
