vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 光源固定在画面下方中心 → 向上发散的光柱（丁达尔 / 神光）
    vec2 dir = p - vec2(0.0, -0.95);
    float d = length(dir);
    float a = atan(dir.x, dir.y);
    float n = floor(max(refP0, 4.0));
    float ang = max(refP1, 0.12);
    float win = 1.0 - ref_smoothstep(ang * 0.55, ang, abs(a));
    // 「光柱数」按可见锥（±张角）均分 —— 若按整圈 2π 均分，锥内只剩 1~2 条，
    // 参数名与画面完全对不上（v0.12 修）
    float seg = (2.0 * ang) / max(n, 2.0);
    float k = floor(a / seg + 0.5);
    float ac = k * seg;
    float sh = pow(max(cos((a - ac) / seg * 3.14159265359), 0.0), max(1.1, 3.6 * refP3));
    float fade = exp(-d / max(refP2, 0.15)) * ref_smoothstep(0.0, 0.07, d);
    float brk = 1.0 - clamp(refP4, 0.0, 1.0) * (1.0 - ref_fbmP(p * 2.6 + vec2(0.0, 3.0), 3, 0.5));
    return clamp(sh * fade * win * brk * 2.4, 0.0, 1.0);
