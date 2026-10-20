vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 苏格兰格纹：两组正交条纹叠加，细条贴在主条两侧，交叠处按「交织对比」加强。
    // 注意：GLSL 不允许嵌套函数定义，所以 x / y 两组条纹必须展开各写一遍。
    float n = floor(max(refP0, 2.0));
    float wa = clamp(refP1, 0.03, 0.48);
    float wb = clamp(refP2, 0.005, 0.22);
    float m  = floor(max(refP3, 1.0));
    vec2 t = p * n;
    float ax = abs(fract(t.x) - 0.5);
    float ay = abs(fract(t.y) - 0.5);
    float hx = 1.0 - ref_smoothstep(wa * 0.5, wa * 0.5 + 0.02, ax);
    float hy = 1.0 - ref_smoothstep(wa * 0.5, wa * 0.5 + 0.02, ay);
    for(int i = 0; i < 4; i++){
      if(float(i) >= m) break;
      float off = wa * 0.5 + wb * 0.5 + float(i) * (wb * 1.35);
      hx = max(hx, (1.0 - ref_smoothstep(wb * 0.5, wb * 0.5 + 0.012, abs(ax - off))) * 0.82);
      hy = max(hy, (1.0 - ref_smoothstep(wb * 0.5, wb * 0.5 + 0.012, abs(ay - off))) * 0.82);
    }
    // 交织：亮线取并集，交叠处按对比加强
    float v = max(hx, hy);
    v = mix(v, v * 0.62 + min(hx, hy) * 0.55, clamp(refP4, 0.0, 1.0));
    return clamp(v, 0.0, 1.0);
