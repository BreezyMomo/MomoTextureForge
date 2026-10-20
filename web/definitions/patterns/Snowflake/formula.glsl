vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float R = max(refP0, 0.15);
    float w = max(refP2, 0.0015);
    float arms = floor(max(refP4, 3.0));
    float nb = floor(max(refP1, 1.0));
    float v = 0.0;
    // 六（N）重对称：把点旋转到每一根主臂的局部队标里作图（保证枝条是直线）
    for(int i = 0; i < 8; i++){
      if(float(i) >= arms) break;
      vec2 q = ref_rot2(p, -6.28318530718 * float(i) / arms);
      float along = (1.0 - ref_smoothstep(R * 0.92, R, q.y)) * step(-R * 0.05, q.y);
      v = max(v, ref_strokeD(q.x, w, 0.003) * along);
      for(int j = 0; j < 6; j++){
        if(float(j) >= nb) break;
        float tt = (float(j) + 0.6) / (nb + 0.2);
        float y0 = R * mix(0.22, 0.88, tt);
        float l = R * max(refP3, 0.05) * mix(0.55, 0.22, tt);
        vec2 A = vec2(0.0, y0);
        // 左右各一根 ±60° 侧枝（对称 = 晶体）
        v = max(v, ref_strokeD(ref_sdSeg(q, A, A + vec2(-l * 0.866, l * 0.5)), w * 0.8, 0.003));
        v = max(v, ref_strokeD(ref_sdSeg(q, A, A + vec2(l * 0.866, l * 0.5)), w * 0.8, 0.003));
      }
    }
    // 中心冰核
    v = max(v, ref_strokeD(length(p) - R * 0.14, w, 0.003));
    return clamp(v, 0.0, 1.0);
