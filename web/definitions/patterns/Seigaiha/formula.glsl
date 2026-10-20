vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 青海波（日本传统鱼鳞纹）：交错半圆格，每格圆心在格子下边中点，
    // 只保留上半圆 → 一圈圈同心弧叠加成鱼鳞。
    float n = floor(max(refP0, 3.0));
    vec2 gp = p * (n * 0.5);
    gp.x += mod(floor(gp.y + 0.5) + 1.0, 2.0) * clamp(refP4, 0.0, 0.5);
    vec2 lc = fract(gp + 0.5) - 0.5;
    vec2 rel = vec2(lc.x, lc.y - 0.5);          // 圆心 → 格子下边中点
    float rr = length(rel);
    float rings = floor(max(refP1, 1.0));
    float t = rr * rings;
    float dl = abs(fract(t) - 0.5) / rings;     // 到最近弧线的径向距离
    // 线宽按 p 单位给：gp = p*(n*0.5)，即局部空间相对 p 放大 n/2 倍
    float w = min(max(refP2, 0.0015) * (n * 0.5), 0.30);
    float v = 1.0 - ref_smoothstep(w, w * (1.0 + max(refP3, 0.2) * 1.6), dl);
    v *= ref_smoothstep(0.46, 0.40, -rel.y);        // 只保留上半圆
    return clamp(v, 0.0, 1.0);
