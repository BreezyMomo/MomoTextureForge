vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 g = uv * max(refP0, 3.0);
    g.x += mod(floor(g.y), 2.0) * 0.5;
    vec2 id = floor(g), f = fract(g) - 0.5;
    float dia = abs(f.x) * 0.80 + abs(f.y);
    float sc = 1.0 - ref_smoothstep(refP2 - max(refP1, 0.02), refP2 + max(refP1, 0.02), dia);
    float bright = mix(1.0 - refP3, 1.0, ref_hash1(id + 2.3));
    return clamp(sc * bright, 0.0, 1.0);
