vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float dens = max(refP0, 3.0);
    vec2 q = p * dens * 0.5 + 0.5;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float v = 0.0;
    for(int y = -1; y <= 1; y++)
    for(int x = -1; x <= 1; x++){
      vec2 g = vec2(float(x), float(y));
      vec2 rr = ref_hash2(id + g);
      if(rr.x > refP2) continue;                        // 出现概率：rr.x ≤ refP2 的格子才有碎块
      vec2 c = g + (rr - 0.5) * 0.62;
      float sz = max(refP1, 0.02) * (0.55 + 0.75 * ref_hash1(rr * 4.3 + 1.1));
      vec2 d = ref_rot2(f - c, rr.y * 3.14159265359);
      float dd = ref_ngonDist(d, 3.0 + floor(ref_hash1(rr * 7.7 + 2.3) * 4.0), sz);
      v = max(v, ref_fillD(dd, max(refP3, 0.002)));
      if(refP4 > 0.002){
        v = max(v, ref_strokeD(dd, max(refP4, 0.002), 0.004) * 0.9);
      }
    }
    return clamp(v, 0.0, 1.0);
