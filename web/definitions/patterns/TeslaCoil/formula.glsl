vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 特斯拉电弧：从底部中心向上随机游走的折线。
    // 时间取 floor() 量化 → 每帧跳一次（电流的爆闪感），而不是平滑蠕动。
    float n = floor(max(refP0, 1.0));
    float len = max(refP1, 0.12);
    float stepT = max(refP2, 0.4);
    float w = max(refP3, 0.0012);
    float y0 = -0.95 + max(refP4, 0.0);
    float tick = floor(time * stepT * 2.0);
    float v = 0.0;
    for(int i = 0; i < 6; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      vec2 pp = vec2(0.0, y0);
      for(int k = 0; k < 8; k++){
        float fk = float(k);
        float hx = ref_hash1(vec2(fi * 7.13 + fk * 3.71, tick * 1.37 + fi * 2.11));
        float hy = ref_hash1(vec2(fi * 2.33 + fk * 5.17, tick * 2.71 + fi * 1.73));
        vec2 nx = pp + vec2((hx - 0.5) * (0.30 + 0.34 * len), len * 0.115 * (0.7 + 0.6 * hy));
        v = max(v, ref_strokeD(ref_sdSeg(p, pp, nx), w, w * 0.8));
        pp = nx;
      }
    }
    return clamp(v, 0.0, 1.0);
