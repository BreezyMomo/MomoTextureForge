vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 g = uv * max(refP0, 4.0);
    vec2 id = floor(g), f = fract(g);
    float h = ref_hash1(id);
    float d = length(f - 0.5);
    float dt = ref_fillD(d - 0.32, 0.04);
    float on = ref_sstepW(1.0 - refP1, 0.12, h);
    float scan = 0.75 + 0.25 * sin(id.y * 2.0 - time * refP2 * 6.0);
    return clamp(dt * max(on * scan, refP3), 0.0, 1.0);
