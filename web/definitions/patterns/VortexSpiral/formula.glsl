vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = max(length(p), 0.02);
    float a = atan(p.y, p.x);
    float ph = a / 6.28318530718 + refP0 * log(r) / 6.28318530718 - time * refP3;
    float v = fract(ph);
    float w = refP1 * (0.3 + 0.7 * clamp(r, 0.0, 1.0));
    float line = 1.0 - ref_smoothstep(w * 0.5, w * 0.5 + 0.012, abs(v - 0.5));
    return clamp(line * (1.0 - ref_smoothstep(0.45, 1.25, r)) * refP2, 0.0, 1.0);
