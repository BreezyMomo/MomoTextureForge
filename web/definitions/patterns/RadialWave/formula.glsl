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
    float n = floor(max(refP0, 3.0));
    // 半径被角向正弦扰动 → 同心环变成波浪环
    float rw = r - max(refP1, 0.0) * 0.16 * sin(a * n + refP2);
    float rings = floor(max(refP4, 2.0));
    float t = rw * rings;
    float dl = abs(fract(t + 0.5) - 0.5) / rings;   // 到最近环线的径向距离
    float w = max(refP3, 0.0015);
    float v = 1.0 - ref_smoothstep(w, w * 2.2, dl);
    v *= 1.0 - ref_smoothstep(0.90, 1.0, r);
    return clamp(v, 0.0, 1.0);
