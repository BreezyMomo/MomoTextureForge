vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float rows = max(refP0, 8.0);
    float ph = fract(uv.y * rows - time * refP1);
    float line = 1.0 - ref_smoothstep(0.0, max(refP2, 0.02), ph);
    float sweep = fract(uv.y - time * refP3 * 0.25);
    float band = pow(1.0 - sweep, 6.0);
    float noise = ref_hash1(vec2(floor(uv.y * rows), floor(time * 12.0))) * 0.30;
    return clamp(line * (0.55 + band * 0.95 + noise), 0.0, 1.0);
