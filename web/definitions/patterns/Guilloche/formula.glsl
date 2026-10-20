vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    // 扭索底纹（钞票 / 证书 / 护照）：两组正弦细线互相被对方调制相位，
    // 形成编织状的精细网格。距离用 |sin(phase)| 对空间频率归一化近似。
    float kx = max(refP0, 1.0);
    float ky = max(refP1, 1.0);
    float amp = max(refP2, 0.0);
    float fr = max(refP3, 0.5);
    float w = max(refP4, 0.0012);
    float wf = fr * 3.14159265359;
    float px = p.x * wf + amp * sin(p.y * kx);
    float py = p.y * wf + amp * sin(p.x * ky);
    float dx = abs(sin(px)) / wf;
    float dy = abs(sin(py)) / wf;
    float lx = 1.0 - ref_smoothstep(w, w * 2.0, dx);
    float ly = 1.0 - ref_smoothstep(w, w * 2.0, dy);
    float v = max(lx, ly) * 0.92 + min(lx, ly) * 0.20;
    float rad = length(p);
    v *= 1.0 - ref_smoothstep(0.86, 1.02, rad);
    return clamp(v, 0.0, 1.0);
