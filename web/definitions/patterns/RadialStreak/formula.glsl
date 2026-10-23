vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = length(p);
    // Sample a closed circle in noise space so both sides of the negative X axis join.
    vec2 direction = r > 0.000001 ? p / r : vec2(1.0, 0.0);
    float angularNoise = ref_fbmP(direction * 3.0 + vec2(0.0, 7.3), 3, 0.5);
    float distortion = (angularNoise * 2.0 - 1.0);
    if(refP4 > 0.5 && refP4 < 1.5) distortion = 0.0;
    if(refP4 > 1.5) distortion = sin(atan(direction.y, direction.x) * max(1.0, floor(refP7 + 0.5)));
    float phase = (r - refP5) * refP0 + distortion * refP1 * 4.0 - time * refP6 + c.x;
    float w = fract(phase);
    // Zero width preserves the original sawtooth profile; positive width makes a soft ring.
    float v = c.y > 0.0
        ? 1.0 - ref_smoothstep(c.y * 0.5, c.y * 0.5 + max(refP2, 0.005), abs(w - 0.5))
        : ref_sstepW(0.5, max(refP2, 0.005), w);
    if(refP5 > 0.0) v *= ref_smoothstep(refP5, refP5 + max(refP2 / max(refP0, 1.0), 0.002), r);
    return v * (1.0 - ref_smoothstep(refP3 * 0.6, refP3 * 1.35, r));
