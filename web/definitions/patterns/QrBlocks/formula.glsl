vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float N = max(refP0, 8.0);
    vec2 g = floor(uv * N);
    float blk = step(1.0 - clamp(refP1, 0.05, 0.95), ref_hash1(g + 3.3));
    float nm = N - 1.0;
    float zone = 0.0, ring = 0.0;
    for(int i = 0; i < 3; i++){
      vec2 qq = g;
      if(i == 1) qq = vec2(nm - g.x, g.y);
      if(i == 2) qq = vec2(g.x, nm - g.y);
      float inb = step(max(qq.x, qq.y), 6.0) * step(0.5, refP3);
      float r = max(abs(qq.x - 3.0), abs(qq.y - 3.0));
      float ok = (r > 2.5) ? 1.0 : ((r < 1.5) ? 1.0 : 0.0);
      zone = max(zone, inb);
      ring = max(ring, inb * ok);
    }
    float v = mix(blk, ring, zone);
    float quiet = step(refP2, min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y)));
    return clamp(v * quiet, 0.0, 1.0);
