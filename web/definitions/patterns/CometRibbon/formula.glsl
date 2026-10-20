vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float y = clamp(uv.y, 0.0, 1.0);
    float x = uv.x - 0.5;
    float cd = max(refP0, 0.01);
    float core = 1.0 - ref_smoothstep(cd * 0.5, cd, length(vec2(x, (y - 1.0) * 1.4)));
    float spread = max(refP1, 0.05) * (1.0 - y) * 0.5;
    float cone = 1.0 - ref_smoothstep(0.0, max(spread, 0.02), abs(x));
    float dust = ref_fbmV(vec2(x * 8.0, y * 5.0), 4, 0.55);
    float emit = pow(y, max(refP3, 0.05) * 2.4);
    float grain = step(0.80, ref_hash1(floor(vec2(uv.x, uv.y) * 150.0)));
    return clamp(core + cone * emit * (dust * 0.85 + grain * 1.1) * max(refP2, 0.0) * 2.0,
                 0.0, 1.0);
