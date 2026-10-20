vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float v = 0.0;
    float nl = floor(max(refP3, 1.0));
    for(int i = 0; i < 3; i++){
      if(float(i) >= nl) break;
      float fi = float(i);
      float sc = 8.0 + fi * 14.0;
      vec2 q = uv * sc;
      vec2 ci = floor(q);
      vec2 c = fract(q) - 0.5;
      vec2 o = (ref_hash2(ci + fi * 17.0) - 0.5) * 0.85;
      float on = step(1.0 - refP0 / (1.0 + fi), ref_hash1(ci + fi * 5.0));
      float d = length(c - o) - refP1 * (1.0 - fi * 0.22);
      float flick = 0.55 + 0.45 * sin(time * 2.2 + ref_hash1(ci) * 6.28318530718);
      v = max(v, ref_fillD(d, 0.006) * on * mix(1.0, flick, refP2));
    }
    return clamp(v, 0.0, 1.0);
