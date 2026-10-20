vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float d = 1e3;
    float n = floor(max(refP0, 3.0));
    for(int i = 0; i < 40; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      float a = 6.28318530718 * fi / n + (ref_hash1(vec2(fi, 2.3)) - 0.5) * 1.5;
      float len = refP1 * (1.0 - refP2 * ref_hash1(vec2(fi, 8.1)));
      float w = refP3 * (0.35 + 0.65 * ref_hash1(vec2(fi, 3.7)));
      vec2 tip = vec2(cos(a), sin(a)) * len;
      d = min(d, ref_sdSeg(p, vec2(0.0), tip) - w);
    }
    d = min(d, length(p) - refP3 * 1.7);
    return ref_fillD(d, 0.006);
