vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 横向拉伸的噪声 = 镜头上的抹痕（用于叠加在光晕上，模拟脏镜头）
    vec2 q = vec2(p.x * max(refP0, 0.3), p.y * 3.0);
    float n1 = ref_fbmP(q * 1.3 + vec2(1.7, 3.9), 4, 0.5);
    float cov = clamp(refP1, 0.02, 1.0);
    float v = ref_smoothstep(0.48 - cov * 0.35, 0.60 + cov * 0.35, n1) * 0.85;
    for(int i = 0; i < 6; i++){
      if(float(i) >= floor(max(refP2, 0.0))) break;
      vec2 rr = ref_hash2(vec2(float(i) * 3.7 + 0.3, 9.1));
      float y = (rr.x * 2.0 - 1.0) * 0.9;
      float aa = (rr.y - 0.5) * 0.22;
      float d = ref_sdSeg(p, vec2(-1.15, y - aa), vec2(1.15, y + aa));
      v = max(v, ref_strokeD(d, 0.005, 0.004) * (0.45 + 0.45 * rr.x));
    }
    for(int i = 0; i < 12; i++){
      if(float(i) >= floor(max(refP3, 0.0))) break;
      vec2 rr = ref_hash2(vec2(float(i) * 2.9 + 1.3, 4.7));
      vec2 c = (rr * 2.0 - 1.0) * 0.92;
      float d = length(p - c);
      v = max(v, (1.0 - ref_smoothstep(0.005, 0.014 + 0.012 * rr.y, d)) * 0.75);
    }
    return clamp(v * (1.0 - ref_smoothstep(0.72, 1.02, length(p) * max(refP4, 0.5))), 0.0, 1.0);
