vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float d = length(p) - refP0;
    float n = floor(max(refP1, 3.0));
    for(int i = 0; i < 24; i++){
      if(float(i) >= n) break;
      float a = 6.28318530718 * float(i) / n + ref_hash1(vec2(float(i), 9.3)) * 1.2;
      float len = refP0 * (1.0 + ref_hash1(vec2(float(i), 4.7)) * refP2);
      vec2 tip = vec2(cos(a), sin(a)) * len;
      float w = refP0 * (0.26 + 0.24 * ref_hash1(vec2(float(i), 1.7)));
      d = min(d, ref_sdSeg(p, vec2(0.0), tip) - w);
    }
    return ref_fillD(d, refP3);
