vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float y = clamp(uv.y, 0.0, 1.0);
    float n = clamp(floor(refP0), 1.0, 12.0);
    float x = uv.x - 0.5;
    float w = max(refP2, 0.008);
    float acc = 0.0;
    for(int i = 0; i < 12; i++){
      if(float(i) >= n) break;
      float k = float(i) + 1.0;
      float off = (ref_hash1(vec2(k, 3.1)) - 0.5) * 0.44;
      float wob = (ref_fbmV(vec2(y * 2.4 + k * 7.3,
                             k * 3.7 - time * max(refP3, 0.0) * 0.4), 3, 0.5) - 0.5) * 2.0;
      float d = abs(x - (off + wob * max(refP1, 0.0)));
      acc = max(acc, 1.0 - ref_smoothstep(w * 0.4, w, d));
    }
    return clamp(acc * pow(y, 0.8) * 1.3, 0.0, 1.0);
