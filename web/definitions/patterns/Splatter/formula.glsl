vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0;
    vec2 ci = floor(q);
    vec2 c = fract(q) - 0.5;
    float d = 1e3;
    for(int y = -1; y <= 1; y++)
    for(int x = -1; x <= 1; x++){
      vec2 g = vec2(float(x), float(y));
      vec2 ci2 = ci + g;
      if(ref_hash1(ci2) > 1.0 - refP1){
        float r = refP2 * (0.18 + 0.82 * ref_hash1(ci2 + 3.3));
        vec2 o = (ref_hash2(ci2 + 7.7) - 0.5) * 1.3;
        d = ref_smin(d, length(g + o - c) - r, refP3);
      }
    }
    return ref_fillD(d, 0.006);
