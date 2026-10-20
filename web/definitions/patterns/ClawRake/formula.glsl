vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = clamp(floor(refP0), 1.0, 7.0);
    float y = clamp(uv.y, 0.0, 1.0);
    float x = uv.x - 0.5;
    float acc = 0.0;
    for(int i = 0; i < 7; i++){
      if(float(i) >= n) break;
      float k = float(i);
      float cen = (k - (n - 1.0) * 0.5) * 0.145;
      float bend = (1.0 - y) * (1.0 - y) * max(refP2, 0.0) * (0.5 + ref_hash1(vec2(k, 5.1)));
      float d = abs(x - cen - bend);
      float w = max(refP1, 0.004) * mix(1.0, 0.10, clamp((1.0 - y) * (1.0 + refP3), 0.0, 1.0));
      acc = max(acc, 1.0 - ref_smoothstep(max(w * 0.45, 0.001), max(w, 0.005), d));
    }
    return clamp(acc, 0.0, 1.0);
