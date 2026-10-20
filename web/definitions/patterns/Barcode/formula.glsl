vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float x = uv.x * refP0;
    float i = floor(x);
    float w = 0.25 + 0.55 * ref_hash1(vec2(i, 1.9));
    float bar = 1.0 - ref_smoothstep(w * refP1 - 0.004, w * refP1 + 0.004, fract(x));
    float guard = step(0.06, uv.y) * step(uv.y, 0.94);
    return clamp(bar * guard * refP2, 0.0, 1.0);
