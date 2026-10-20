vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 音频频谱条：底对齐、高度随时间的伪随机跳动。
    // 由「低频正弦（整体律动）+ 每根条的噪声（细节）」叠加，
    // 避免纯 hash 跳动看起来像雪花噪点。
    float n = floor(max(refP0, 8.0));
    float lx = fract((p.x * 0.5 + 0.5) * n) - 0.5;
    float i  = floor((p.x * 0.5 + 0.5) * n);
    float ph = time * max(refP2, 0.1);
    float wob = 0.52 + 0.48 * sin(ph * 1.7 + i * 1.31);
    float det = (ref_fbmP(vec2(i * 2.3, ph * 0.9), 2, 0.5) * 0.5 + 0.5);
    float hgt = clamp(wob * mix(1.0, det, clamp(refP4, 0.0, 1.0)), 0.06, 1.0) * max(refP1, 0.05);
    float bar = 1.0 - ref_smoothstep(max(refP3, 0.1) * 0.5, max(refP3, 0.1) * 0.5 + 0.03, abs(lx));
    float top = -1.0 + 2.0 * hgt;
    float on  = 1.0 - ref_smoothstep(top - 0.012, top + 0.012, p.y);
    return clamp(bar * on, 0.0, 1.0);
