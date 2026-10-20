vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 c = uv - 0.5;
    float r = length(c) * 2.0;
    float a = atan(c.y, c.x);
    float sweep = fract(a / 6.28318530718 + 0.5 - time * refP0);
    float glow = pow(1.0 - sweep, max(refP1, 0.4));
    float rings = ref_sstepW(0.06, 0.02, abs(fract(r * refP2) - 0.5) * 2.0 - 0.6);
    float blip = step(1.0 - refP3 * 0.3, ref_hash1(floor(c * 24.0) + floor(time * 2.0))) * step(r, 0.95);
    return clamp(glow * 0.8 + rings * 0.25 + blip, 0.0, 1.0) * ref_sstepI(1.0, 0.94, r);
