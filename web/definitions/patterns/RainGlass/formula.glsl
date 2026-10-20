vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = floor(max(refP0, 4.0));
    float sz = max(refP1, 0.008);
    float v = 0.0;
    for(int i = 0; i < 24; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      vec2 rr = ref_hash2(vec2(fi * 4.7 + 0.5, fi * 2.3 + 1.7));
      // 循环下落：+0.35 相位让 t=0 时雨滴已铺满画面（不是全挤在顶部）
      float fall = fract(rr.y + time * max(refP3, 0.0) * 0.25 + 0.35);
      vec2 c = vec2((rr.x * 2.0 - 1.0) * 0.92, mix(0.98, -0.98, fall));
      float ri = sz * (0.6 + 0.85 * rr.x);
      float d = length(p - c);
      float drop = (1.0 - ref_smoothstep(ri * 0.30, ri, d)) * 0.30;
      float rim = ref_smoothstep(ri * 0.55, ri * 0.86, d) *
                  (1.0 - ref_smoothstep(ri * 0.86, ri * 1.05, d)) * max(refP4, 0.2);
      v = max(v, drop + rim);
      // 下方拖出的水痕
      float ty = c.y - p.y;
      float tail = ref_strokeD(p.x - c.x, ri * 0.30, 0.003) * step(0.0, ty) *
                   (1.0 - ref_smoothstep(0.0, ri * max(refP2, 0.5) * 4.0, ty));
      v = max(v, tail * 0.55);
    }
    return clamp(v, 0.0, 1.0);
