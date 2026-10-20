vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

         // Waves: 频率P0 振幅P1 速度P2 线宽P3
    float y = uv.y - 0.5 + refP1 * 0.5 * sin(uv.x * refP0 * 6.28318530718 + time * refP2 * 6.28318530718);
    return 1.0 - ref_smoothstep(refP3, refP3 + 0.012, abs(y));
