vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = floor(max(refP0, 2.0));
    float mn = 2.0, mx = -2.0, acc = 0.0, cnt = 0.0;
    for(int i = 0; i < 4; i++){
      if(float(i) >= n) break;
      vec2 q = ref_rot2(uv - 0.5, refP1 + float(i) * 6.28318530718 / n);
      float t = clamp(q.y + 0.5, 0.0, 1.0);
      mn = min(mn, t); mx = max(mx, t); acc += t; cnt += 1.0;
    }
    int mode = int(floor(refP2 + 0.5));
    if(mode == 0) return mn;
    if(mode == 1) return mx;
    return acc / max(cnt, 1.0);
