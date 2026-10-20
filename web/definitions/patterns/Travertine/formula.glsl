vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 洞石（石灰华）：水平层理 + 顺层方向被拉长的溶蚀孔洞。
    float ly = p.y * max(refP0, 2.0) + ref_fbmP(p * 1.7, 2, 0.5) * 0.9;
    float band = 0.5 + 0.5 * sin(ly * 6.28318530718 * 0.33);
    float base = mix(0.52, 0.20 + 0.80 * band, clamp(refP4, 0.0, 1.0));
    float n = floor(max(refP1, 2.0));
    float sz = max(refP2, 0.012);
    float holes = 0.0;
    for(int i = 0; i < 18; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      vec2 rr = ref_hash2(vec2(fi * 3.71 + 0.23, fi * 6.13 + 4.41));
      vec2 c = (rr * 2.0 - 1.0) * 0.92;
      // 顺层拉长：x 方向 2.6 倍
      float d = length(vec2((p.x - c.x) / (sz * 2.6), (p.y - c.y) / sz)) - 1.0;
      holes = max(holes, 1.0 - ref_smoothstep(0.0, 0.55, d));
    }
    float v = base * (1.0 - holes * max(refP3, 0.0));
    return clamp(v, 0.0, 1.0);
