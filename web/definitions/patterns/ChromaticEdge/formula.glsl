vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 镜头色散在灰度域的表现：同一圈环线被错开成 3 条（R/G/B 分离）。
    // 色散量随视场（半径）线性增大 —— 真实镜头边角色散最明显。
    float r = length(p);
    float rings = floor(max(refP0, 3.0));
    float rr = r * rings;
    float k  = floor(rr);
    float rc = (k + 0.5) / rings;                 // 该环所在半径
    float dr = (rr - k - 0.5) / rings;            // 到环线的径向距离
    float disp = max(refP1, 0.0) * rc * 0.16;
    float w = max(refP2, 0.0012);
    float a = ref_strokeD(dr - disp, w,        w * 0.60);
    float b = ref_strokeD(dr + disp, w,        w * 0.60);
    float m = ref_strokeD(dr,        w * 1.30, w * 0.70);
    float v = max(m, max(a, b) * 0.72);
    v *= 1.0 - ref_smoothstep(0.84, 1.00, r);          // 外圈淡出
    v *= ref_smoothstep(max(refP4, 0.0), max(refP4, 0.0) + 0.06, r);   // 中心留白
    return clamp(v * max(refP3, 0.05), 0.0, 1.0);
