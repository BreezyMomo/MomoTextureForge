vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    /* 弧冠朝上、横贯画布的浅弧：圆心放在画布下方，弧带扫过中下部 */
    vec2 c = uv - vec2(0.5, -0.08);
    float r = length(c);
    float a = atan(c.x, c.y);
    float halfA = max(refP1, 0.05) * 0.5;
    float e0 = max(halfA * (1.0 - clamp(refP3, 0.0, 0.95)), 0.002);
    float e1 = max(halfA, e0 + 0.002);
    float ang = 1.0 - ref_smoothstep(e0, e1, abs(a));
    float w = max(refP2, 0.008);
    float band = 1.0 - ref_smoothstep(w * 0.4, w, abs(r - max(refP0, 0.02)));
    return clamp(ang * band, 0.0, 1.0);
