vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 羽毛：一根中轴 + 两侧周期性斜向羽枝（用有限长线段 ref_sdSeg 画，
    // 长度 / 角度连续可调 → 比用条纹裁剪更好控制观感）。
    float n = floor(max(refP0, 4.0));
    float len = max(refP1, 0.08);
    float sw = max(refP2, 0.0015);
    float sway = max(refP3, 0.0);
    float w = max(refP4, 0.0012);
    float v = ref_strokeD(p.x, sw, sw * 1.6);                 // 中轴
    for(int i = 0; i < 16; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      float y0 = -0.92 + (fi + 0.5) * (1.84 / max(n, 1.0));
      float ph = sin(fi * 1.37) * sway * 0.20;
      // 羽枝越靠近两端越短（真实羽毛的轮廓）
      float leni = len * (0.55 + 0.45 * sin((fi + 0.5) / max(n, 1.0) * 3.14159265359));
      v = max(v, ref_strokeD(ref_sdSeg(p, vec2(0.0, y0), vec2( leni, y0 + leni * 0.52 + ph)), w, w * 0.7));
      v = max(v, ref_strokeD(ref_sdSeg(p, vec2(0.0, y0), vec2(-leni, y0 + leni * 0.52 - ph)), w, w * 0.7));
    }
    return clamp(v, 0.0, 1.0);
