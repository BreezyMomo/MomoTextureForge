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
    float m = floor(max(refP0, 3.0));
    float seg = 6.28318530718 / m;
    // 折进 1/m 楔形 → 天然镜像对称
    float af = abs(mod(a + seg * 0.5, seg) - seg * 0.5);
    vec2 q = vec2(cos(af), sin(af)) * r;
    q = ref_rot2(q, refP2) * max(refP1, 0.2);
    float v = ref_fbmP(q + vec2(3.1, 1.7), 4, 0.5);
    v = clamp((v - 0.5) * max(refP3, 0.2) + 0.5, 0.0, 1.0);
    return v;
