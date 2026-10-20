vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

          // Concentric: 频率P0 柔和P1 相位P2
    float d = length(p) * refP0 * 6.28318530718 + refP2;
    float v = 0.5 + 0.5 * sin(d);
    return ref_sstepW(0.5, refP1, v);
