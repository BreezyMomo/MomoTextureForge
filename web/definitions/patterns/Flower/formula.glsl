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
    float n = floor(max(refP0, 3.0));
    // |cos(n·a/2)| 在 [0,2π) 上恰好有 n 个瓣（奇偶都成立）
    float pet = pow(max(abs(cos(n * 0.5 * a + refP2)), 0.0), max(refP3, 0.05));
    float R = max(refP1, 0.1) * (0.30 + 0.70 * pet);
    float body = ref_fillD(r - R, 0.004);
    float edge = ref_strokeD(r - R, max(refP4, 0.0012), 0.003);
    float core = ref_fillD(r - max(refP1, 0.1) * 0.16, 0.004);
    return clamp(max(max(body, edge), core), 0.0, 1.0);
