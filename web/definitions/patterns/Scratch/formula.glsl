vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float acc = 0.0;
    float n = floor(max(refP0, 1.0));
    for(int i = 0; i < 24; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      float a = ref_hash1(vec2(fi, 1.1)) * 3.14159265359;
      float off = (ref_hash1(vec2(fi, 6.3)) - 0.5) * 1.8;
      float len = refP1 * (0.35 + 0.65 * ref_hash1(vec2(fi, 2.7)));
      vec2 q = ref_rot2(uv - 0.5, a);
      float d = ref_sdSeg(q, vec2(off, 0.0) - vec2(len, 0.0), vec2(off, 0.0) + vec2(len, 0.0)) - refP2;
      acc = max(acc, ref_fillD(d, 0.003) * (0.45 + 0.55 * ref_hash1(vec2(fi, 4.9))));
    }
    return clamp(acc * refP3, 0.0, 1.0);
