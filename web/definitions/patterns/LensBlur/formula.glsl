vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 焦外的散焦光斑 = 光圈形状（多边形）——中心区域「合焦」光斑小，
    // 越靠画面边缘散焦越严重（光斑变大），这是真实景深的视觉特征。
    float n = floor(max(refP0, 4.0));
    float inFocus = clamp(refP1, 0.0, 0.95);
    float gain = max(refP2, 0.2);
    float blades = floor(max(refP3, 3.0));
    float v = 0.0;
    for(int i = 0; i < 28; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      vec2 rr = ref_hash2(vec2(fi * 5.13 + 0.31, fi * 2.71 + 7.93));
      vec2 c = (rr * 2.0 - 1.0) * 0.90;
      float rc = length(c);
      // 散焦程度：离画面中心越远 → 光斑越大
      float defocus = clamp((rc - inFocus) / max(1.0 - inFocus, 0.15), 0.0, 1.0);
      float ri = 0.042 * mix(1.0, 1.0 + gain, defocus);
      float d = ref_ngonDist(p - c, blades, ri);
      float disc = ref_fillD(d, ri * 0.55);
      float rim  = ref_strokeD(d, ri * 0.12, ri * 0.07);
      float amp  = mix(0.58, 1.0, rr.x);
      v = max(v, disc * amp + rim * 0.42);
    }
    return clamp(v * max(refP4, 0.05), 0.0, 1.0);
