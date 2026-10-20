vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float dens = max(refP0, 2.0);
    vec2 q = p * dens * 0.9;
    vec2 hc = ref_hexCell(q);
    float d = ref_hexDist(hc);                    // 0 = 格心，0.5 = 六边边界
    float w = max(refP1, 0.008);
    float edge = ref_strokeD(d - 0.5, w, 0.012);
    float fill = clamp((0.5 - d) / 0.5, 0.0, 1.0);
    float v = max(edge, 0.22 * fill * fill);
    // 全息能量波纹（由中心向外扩散）
    float pulse = 0.55 + 0.45 * sin(time * max(refP3, 0.0) * 2.6 - length(p) * 7.0);
    v *= mix(1.0, pulse, clamp(refP4, 0.0, 1.0));
    float R = max(refP2, 0.3);
    return clamp(v * (1.0 - ref_smoothstep(R - 0.10, R, length(p))), 0.0, 1.0);
