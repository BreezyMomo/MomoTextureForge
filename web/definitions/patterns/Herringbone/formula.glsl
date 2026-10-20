vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0;
    float row = floor(q.y);
    float fy = fract(q.y);
    float zig = (mod(row, 2.0) < 0.5) ? fy : 1.0 - fy;   // 相邻行镜像 -> 人字
    float v = fract(q.x * 0.5 * max(refP1, 0.2) + zig * 0.5);
    float sw = clamp(refP2, 0.02, 0.5) * 0.5;
    return 1.0 - ref_smoothstep(sw - 0.01, sw + 0.01, abs(v - 0.5));
