vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = floor(max(refP0, 2.0));
    float sz = max(refP1, 0.02);
    float spread = mix(0.30, 0.88, clamp(refP4, 0.0, 1.0));
    float v = 0.0;
    for(int i = 0; i < 14; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      vec2 rr = ref_hash2(vec2(fi * 7.31 + 0.7, fi * 3.17 + 5.1));
      vec2 c = (rr * 2.0 - 1.0) * spread;
      float ri = sz * mix(0.55, 1.35, ref_hash1(vec2(fi * 2.7 + 1.1, 11.3)));
      float d = length(p - c);
      // 直径盘 + 边缘略亮的「面包圈」外缘（真实散景特征）
      float disc = 1.0 - ref_smoothstep(ri * max(0.12, 1.0 - 0.78 * refP3), ri, d);
      float rim = ref_smoothstep(ri * 0.52, ri * 0.94, d) *
                  (1.0 - ref_smoothstep(ri * 0.94, ri * 1.05, d));
      v = max(v, disc * mix(1.0, 0.60, rr.x * clamp(refP2, 0.0, 1.0)) + rim * 0.45);
    }
    return clamp(v * 1.12, 0.0, 1.0);
