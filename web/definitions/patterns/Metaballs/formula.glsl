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
    float spread = clamp(refP1, 0.15, 0.95);
    float str = max(refP2, 0.03);
    float f = 0.0;
    for(int i = 0; i < 10; i++){
      if(float(i) >= n) break;
      vec2 c = ref_hash2(vec2(float(i) * 5.13 + 0.9, float(i) * 2.71 + 3.3)) * 2.0 - 1.0;
      c *= spread;
      float d2 = dot(p - c, p - c);
      f += str / max(d2, 0.003);      // 反平方势场：球与球自然融合（不像硬圆那样生硬相交）
    }
    float th = max(refP3, 0.1);
    float so = max(refP4, 0.02);
    return clamp(ref_smoothstep(th - so, th + so, f), 0.0, 1.0);
