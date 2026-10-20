vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 拼图块轮廓：方形四边中点各挂一个圆凸耳，上/左凸、下/右凹，相邻块正好咬合。
    float n = floor(max(refP0, 1.0));
    vec2 g = p * n;
    vec2 id = floor(g + 0.5);
    vec2 lc = (g - id) * 2.0;                       // -1..1 局部坐标
    float R = clamp(refP2, 0.4, 0.96);
    float k = max(refP1, 0.04) * 0.5;
    float sq = max(abs(lc.x), abs(lc.y)) - R;
    float up = length(vec2(lc.x, lc.y - R)) - k;    // 上边凸
    float lf = length(vec2(lc.x + R, lc.y)) - k;    // 左边凸
    float dn = length(vec2(lc.x, lc.y + R)) - k;    // 下边凹（挖掉）
    float rt = length(vec2(lc.x - R, lc.y)) - k;    // 右边凹（挖掉）
    float d = ref_smin(ref_smin(sq, up, 0.16), lf, 0.16);   // 方块 ∪ 上凸 ∪ 左凸
    d = max(d, -dn);                                 // − 下凸（变成凹口）
    d = max(d, -rt);                                 // − 右凸
    // 线宽按 p 单位给：lc 相对 p 被放大 2n 倍（lc = (g-id)*2，g = p*n），
    // 所以这里要乘回去，否则默认值下描边只有 0.1~0.3 像素 = 看不见。
    float sc = 2.0 * n;
    float w  = min(max(refP3, 0.0018) * sc, 0.30);
    float sf = min(max(refP4, 0.002) * sc, w * 0.9);
    float v = ref_strokeD(d, w, sf);
    return clamp(v, 0.0, 1.0);
