vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float a = atan(p.y, p.x);
    float r = length(p);
    float n = floor(max(refP0, 6.0));
    float seg = 6.28318530718 / n;
    float k = floor(a / seg + 0.5);
    float ac = k * seg;
    float lane = ref_hash1(vec2(k * 1.7 + 0.3, 7.3));
    // 循环扩张：+0.35 相位让 t=0 时已处于爆开状态（缩略图不是全黑）
    float t = fract(time * max(refP3, 0.05) * 0.22 + 0.35);
    float R = t * max(refP2, 0.2) * mix(0.72, 1.0, lane);
    float wid = max(refP1, 0.008);
    float along = exp(-pow((r - R) / wid, 2.0));
    float across = pow(max(cos((a - ac) / seg * 3.14159265359), 0.0), 12.0);
    float v = along * across;
    // 向内拖出的尾迹（彗尾）
    float tl = max(refP4, 0.05) * 0.9;
    v = max(v, across * exp(-pow((r - R * (1.0 - tl)) / (wid * 2.6 + 0.02), 2.0)) * 0.55);
    v = max(v, exp(-pow(r / 0.06, 2.0)) * (1.0 - t) * 0.9);
    return clamp(v * (1.0 - ref_smoothstep(0.96, 1.0, r)), 0.0, 1.0);
