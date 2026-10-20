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
    float w = fract(r * refP0 + (angularNoise * 2.0 - 1.0) * refP1 * 4.0);
    float v = ref_sstepW(0.5, max(refP2, 0.005), w);
    return v * (1.0 - ref_smoothstep(refP3 * 0.6, refP3 * 1.35, r));
