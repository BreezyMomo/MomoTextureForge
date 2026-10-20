vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 迷宫平面图：格线按「边自身」的随机值决定留/去。
    // 关键：右边界用右邻居的 id、上边界用上邻居的 id 取随机，
    // 否则同一条边被两格各画一次会互相打架（也无法平铺）。
    float n = floor(max(refP0, 3.0));
    vec2 g = p * n;
    vec2 id = floor(g);
    vec2 lc = fract(g) - 0.5;
    // 线宽按 p 单位给：lc 相对 p 被放大 n 倍（lc = fract(g)-0.5，g = p*n）
    float w = min(max(refP2, 0.0015) * n, 0.30);
    float soft = max(refP3, 0.2) * w * 1.4;
    float keep = clamp(refP1, 0.0, 0.95);
    float see = max(refP4, 0.0);
    float sx = ref_hash1(vec2(see * 13.7 + 1.3, see * 5.1 + 9.7));
    float sy = ref_hash1(vec2(see * 7.9 + 4.1, see * 2.3 + 3.3));
    float eL = ref_strokeD(abs(lc.x + 0.5), w, soft);
    float eR = ref_strokeD(abs(lc.x - 0.5), w, soft);
    float eT = ref_strokeD(abs(lc.y + 0.5), w, soft);
    float eB = ref_strokeD(abs(lc.y - 0.5), w, soft);
    float kL = step(keep, ref_hash1(id + vec2(sx, sy)));
    float kR = step(keep, ref_hash1(id + vec2(1.0 + sx, sy)));
    float kT = step(keep, ref_hash1(id + vec2(sx * 1.7, sy * 1.3)));
    float kB = step(keep, ref_hash1(id + vec2(sx * 1.7, 1.0 + sy * 1.3)));
    float v = max(max(eL * kL, eR * kR), max(eT * kT, eB * kB));
    return clamp(v, 0.0, 1.0);
