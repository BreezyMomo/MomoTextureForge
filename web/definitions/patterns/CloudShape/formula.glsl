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
    for(int i = 0; i < 5; i++){
      float fi = float(i);
      float a = fi * 2.399 + 0.7;
      vec2 o = vec2(cos(a), sin(a)) * (refP0 * 0.55);
      float rr = refP0 * (0.5 + 0.42 * ref_hash1(vec2(fi, 3.1)));
      d = ref_smin(d, length(p - o) - rr, refP1);
    }
    d = ref_smin(d, length(p) - refP0 * 0.78, refP1);
    return ref_fillD(d, refP2);
