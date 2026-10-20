vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = length(p);
    float a = atan(p.y, p.x);
    float v = 0.0;
    float n = floor(max(refP0, 1.0));
    for(int i = 0; i < 8; i++){
      if(float(i) >= n) break;
      float ri = 0.22 + 0.13 * float(i);
      float d = abs(r - ri);
      float w = 1.0 - ref_smoothstep(0.006, 0.014, d);
      float g = fract(a / 6.28318530718 * max(refP2, 1.0) + ref_hash1(vec2(float(i), 3.3))
                      + time * refP3 * (0.4 + float(i) * 0.2));
      float gap = step(refP1 * 0.5, g) * step(g, 1.0 - refP1 * 0.5);
      v = max(v, w * mix(1.0, gap, 0.9));
    }
    return clamp(v, 0.0, 1.0);
