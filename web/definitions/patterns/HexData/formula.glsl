vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 科幻数据面板：六角格外框 + 内部随机点亮的「数据位」。
    // ref_hexCell 给出局部偏移 hc，则格中心 = q - hc —— 用它当哈希种子，
    // 保证每个六角格的随机图案互不相同（只用 ref_hexDist 会得到全图相同的涟漪）。
    float n = max(refP0, 3.0);
    vec2 q = p * n;
    vec2 hc = ref_hexCell(q);
    vec2 cid = q - hc;
    float d = ref_hexDist(hc);
    // 线宽按 p 单位给：ref_hexDist 在 q 空间（q = p*n），六边框厚度需乘回 n
    float w = min(max(refP4, 0.0018) * n, 0.16);
    float ring = ref_strokeD(d - 0.5, w, w * 0.7);
    float layers = floor(max(refP3, 0.0));
    float sub = 0.0;
    for(int i = 0; i < 4; i++){
      if(float(i) >= layers) break;
      float fi = float(i);
      float on = step(1.0 - clamp(refP2, 0.0, 1.0), ref_hash1(cid + vec2(fi * 3.3 + 0.7, fi * 1.9 + 2.1)));
      sub = max(sub, on);
    }
    float dots = (1.0 - ref_smoothstep(0.16, 0.30, d)) * sub;
    float v = max(ring, dots * max(refP1, 0.0));
    return clamp(v, 0.0, 1.0);
