vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float cells = floor(max(refP0, 4.0));
    vec2 q = (p * 0.5 + 0.5) * cells;
    ivec2 c = ivec2(floor(q));
    // 位与为 0 的格点集合 = 离散版谢尔宾斯基三角（帕斯卡三角 mod 2）
    float m = float(c.x & c.y);
    float v = (m < 0.5) ? 1.0 : 0.0;
    if(refP2 > 0.01){
      v = max(v, refP2 * 0.5 * ref_vnoise(q * 2.6 + vec2(0.7, 2.1)));
    }
    float rr = max(refP1, 0.3);
    return clamp(v * (1.0 - ref_smoothstep(rr - 0.06, rr, length(p))), 0.0, 1.0);
