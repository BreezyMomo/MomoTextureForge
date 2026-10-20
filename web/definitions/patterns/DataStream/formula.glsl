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
    float sp = 0.3 + ref_hash1(vec2(row, 2.2)) * 1.4;
    float x = fract(uv.x - time * refP3 * 0.3 * sp);
    float seg = step(1.0 - refP1, ref_hash1(vec2(floor(x * refP2), row)));
    float on = step(0.35, ref_hash1(vec2(row, 4.4)));
    return clamp(seg * on * 0.95, 0.0, 1.0);
