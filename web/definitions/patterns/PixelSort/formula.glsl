vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 像素排序（glitch）观感：部分竖列被随机上下拉伸错位，错位边界是硬边。
    float cols = floor(max(refP1, 4.0));
    float ci = floor((p.x * 0.5 + 0.5) * cols);
    float h  = ref_hash1(vec2(ci, 1.31));
    float on = step(max(refP2, 0.0), h);
    float off = (ref_hash1(vec2(ci, 7.13)) - 0.5) * 2.0 * max(refP0, 0.0);
    vec2 q = vec2(p.x, p.y + off * on);
    // 底图用「分块随机亮度」（数据块），不用 fbm 云：ref_fbmP 的分布整体偏亮
    // （实测 base 均值 ≈ 0.83），一阈值化几乎全变白；分块随机天然居中，
    // 二值化后黑白均衡，也更贴近「像素排序故障」的数据块观感。
    float dens = max(refP4, 0.5) * 1.6;
    float lv = ref_hash1(floor(q * dens) + vec2(3.7, 9.1));
    float base = 0.22 + 0.56 * lv;                  // 柔和版：0.22 ~ 0.78（居中）
    float hard = step(0.5, lv);                     // 硬边版：纯 0 / 1
    // 「硬边程度」= 在柔和块与纯黑白块之间切换（refP3=0 全柔和，refP3=1 全硬边）。
    // 旧实现是往 0/1 线性 mix，强度 0.55 时只走到 0.22/0.78 → 根本没有硬边。
    float v = mix(base, hard, on * clamp(refP3, 0.0, 1.0));
    v *= 1.0 - 0.20 * on;                           // 被错位的列整体压暗，错位区域一眼可见
    return clamp(v, 0.0, 1.0);
