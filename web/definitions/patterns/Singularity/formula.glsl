vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 奇点（黑洞）：暗事件视界 + 亮环 + 被引力弯折的扁吸积盘。
    float R = max(refP0, 0.04);
    float sp = max(refP1, 0.0);
    float r = length(p);
    float a = atan(p.y, p.x);
    // 吸积盘：竖向压扁的椭圆环，倾斜度可调（flat 是 GLSL 保留字，变量名避开）
    float flatk = mix(1.0, 0.14, clamp(refP3, 0.0, 1.0));
    float de = length(vec2(p.x, p.y / max(flatk, 0.08)));
    float Rdisk = R * max(refP4, 0.5);
    float disk = ref_strokeD(de - Rdisk, Rdisk * 0.34, Rdisk * 0.22);
    // 盘面旋纹
    float sw = 0.5 + 0.5 * sin(a * floor(max(refP2, 3.0)) + time * sp * 2.0 - r * 7.0);
    float v = disk * (0.30 + 0.70 * sw);
    // 事件视界亮环
    v = max(v, ref_strokeD(r - R, R * 0.20, R * 0.10));
    // 视界内部压黑
    v *= 1.0 - (1.0 - ref_smoothstep(R * 0.92, R * 1.02, r)) * 0.94;
    v *= 1.0 - ref_smoothstep(0.90, 1.05, r);
    return clamp(v, 0.0, 1.0);
