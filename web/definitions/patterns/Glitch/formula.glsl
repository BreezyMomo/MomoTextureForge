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
    float r1 = ref_hash1(vec2(row, 1.7 + floor(time * refP3 * 0.4)));
    float on = step(1.0 - refP2, r1);
    float off = (ref_hash1(vec2(row, 5.3)) - 0.5) * 2.0 * refP1 * on;
    vec2 q = vec2(uv.x + off, uv.y);
    float blk = step(0.72, ref_hash1(floor(q * vec2(refP3, refP0)) + floor(time * refP3)));
    return clamp(blk * 0.9 + on * 0.3, 0.0, 1.0);
