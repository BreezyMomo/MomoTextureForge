vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 实心箭头：等腰三角头 + 矩形杆，尖端朝上，中心偏下摆放。
    float L  = max(refP0, 0.12);
    float HW = max(refP1, 0.06);
    float sw = max(refP2, 0.008);
    float sl = max(refP3, 0.0);
    float sf = max(refP4, 0.002);
    vec2 q = p - vec2(0.0, -0.16);
    // 三角头（顶点在 q.y = L，底边在 q.y = 0）
    float head = max(max(-q.y, q.y - L), abs(q.x) - HW * (1.0 - clamp(q.y / L, 0.0, 1.0)));
    // 矩形杆
    float shaft = max(abs(q.x) - sw, max(-(q.y + sl), q.y));
    float d = min(head, shaft);
    return clamp(ref_fillD(d, sf), 0.0, 1.0);
