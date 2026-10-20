vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0;
    vec2 ci = floor(q);
    vec2 c = fract(q) - 0.5;
    float best = 8.0;
    for(int y = -1; y <= 1; y++)
    for(int x = -1; x <= 1; x++){
      vec2 g = vec2(float(x), float(y));
      vec2 o = (ref_hash2(ci + g) - 0.5) * max(refP2, 0.01);
      best = min(best, length(g + o - c));
    }
    return 1.0 - ref_smoothstep(refP1 * 0.5, refP1 * 0.5 + 0.03, best);
