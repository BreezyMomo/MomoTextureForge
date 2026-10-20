vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 等离子球（辉光球）：中心内核 + 玻璃球壳 + 从内核甩向球壳的等离子触须。
    float n = floor(max(refP0, 4.0));
    float R = max(refP1, 0.06);
    float sp = max(refP2, 0.0);
    float w = max(refP3, 0.0012);
    float r = length(p);
    float v = ref_strokeD(r - R, w * 0.9, w * 0.7);                 // 球壳
    v = max(v, ref_fillD(r - R * 0.20, 0.006) * max(refP4, 0.0));      // 内核
    v = max(v, (1.0 - ref_smoothstep(R * 0.22, R * 0.30, r)) * max(refP4, 0.0) * 0.55);
    for(int i = 0; i < 20; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      float a0 = fi * (6.28318530718 / max(n, 1.0));
      float wob = sin(time * sp * 1.6 + fi * 2.13) * 0.34;
      vec2 tip = vec2(cos(a0 + wob), sin(a0 + wob)) * R;
      vec2 root = vec2(cos(a0), sin(a0)) * R * 0.26;
      v = max(v, ref_strokeD(ref_sdSeg(p, root, tip), w, w * 0.8));
    }
    return clamp(v, 0.0, 1.0);
