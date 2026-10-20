vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 盐壳：多边形晶粒 + 晶界亮纹。ref_voro2 返回 (最近距, 次近距, 0)，
    // 两者之差就是「到晶界的距离」，比单纯取 f1 更贴近真实裂纹。
    float n = max(refP0, 2.0);
    vec2 q = p * n;
    vec3 vo = ref_voro2(q, clamp(refP4, 0.0, 1.0));
    float d = vo.y - vo.x;
    float w = max(refP1, 0.003);
    float crack = 1.0 - ref_smoothstep(w * n, w * n * 2.6, d);
    float grain = 1.0 - ref_smoothstep(0.0, 0.85, vo.x);      // 晶粒中心略亮
    float v = max(crack * max(refP2, 0.0), grain * max(refP3, 0.0));
    return clamp(v, 0.0, 1.0);
