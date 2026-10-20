vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 沥青路面：不规则石粒散布 + 细砂底噪。
    float n = floor(max(refP0, 4.0));
    vec2 q = p * n;
    vec2 id = floor(q + 0.5);
    vec2 lc = q - id;
    float r0 = max(refP1, 0.04) * 0.5;
    float v = 0.0;
    for(int y = -1; y <= 1; y++)
    for(int x = -1; x <= 1; x++){
      vec2 g = vec2(float(x), float(y));
      float h = ref_hash1(id + g);
      vec2 c = g + (ref_hash2(id + g + vec2(7.3, 2.9)) - 0.5) * 0.9;
      float r = r0 * (0.45 + 1.05 * h);
      float d = length(lc - c) - r;
      float base = mix(1.0 - max(refP2, 0.0), 1.0, h);
      v = max(v, ref_fillD(d, max(refP3, 0.002)) * base);
    }
    float sand = ref_fbmP(q * 2.4, 3, 0.5) * 0.5 + 0.5;
    return clamp(max(v, sand * max(refP4, 0.0)), 0.0, 1.0);
