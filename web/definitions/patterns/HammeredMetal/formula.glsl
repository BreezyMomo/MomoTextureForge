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
    float d = length(hc);
    // 六边格上的半球凹坑：格心最暗、格边最亮（浮雕式手工锤打金属）
    float t = clamp(d / (max(refP1, 0.1) * 0.90), 0.0, 1.0);
    float v = mix(1.0, pow(t, 0.65), clamp(refP2, 0.05, 1.0));
    v = clamp(v + max(refP3, 0.0) * (ref_vnoise(p * 18.0) - 0.5), 0.0, 1.0);
    return clamp(v, 0.0, 1.0);
