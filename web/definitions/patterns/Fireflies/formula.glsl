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
    float d = 1e3;
    for(int y = -1; y <= 1; y++)
    for(int x = -1; x <= 1; x++){
      vec2 g = vec2(float(x), float(y));
      vec2 ci2 = ci + g;
      vec2 o = (ref_hash2(ci2) - 0.5) * 1.0;
      float rr = refP1 * (1.0 - refP2 + refP2 * ref_hash1(ci2 + 4.4));
      d = min(d, length(g + o - c) - rr);
    }
    float flick = 0.5 + 0.5 * sin(time * refP3 * 3.0 + ref_hash1(ci) * 6.28318530718);
    return clamp(ref_fillD(d, 0.008) * mix(1.0, flick, 0.7), 0.0, 1.0);
