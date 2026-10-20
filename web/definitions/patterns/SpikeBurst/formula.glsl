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
    for(int i = 0; i < 32; i++){
      if(float(i) >= n) break;
      float a = 6.28318530718 * float(i) / n + ref_hash1(vec2(float(i), 2.3)) * 0.4;
      float len = refP1 * (1.0 - refP2 * ref_hash1(vec2(float(i), 8.1)));
      float w = refP3 * (1.0 - 0.5 * ref_hash1(vec2(float(i), 5.5)));
      vec2 tip = vec2(cos(a), sin(a)) * len;
      d = min(d, ref_sdSeg(p, vec2(0.0), tip) - w * 0.5);
    }
    d = min(d, length(p) - refP3 * 1.4);
    return ref_fillD(d, refP4);
