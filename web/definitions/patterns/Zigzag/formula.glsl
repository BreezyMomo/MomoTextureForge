vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

         // Zigzag: 频率P0 振幅P1 线宽P2 速度P3
    float x = uv.x * refP0 + time * refP3;
    float tri = abs(fract(x) - 0.5) * 2.0 - 0.5;
    float y = uv.y - 0.5 + tri * refP1;
    return 1.0 - ref_smoothstep(refP2, refP2 + 0.012, abs(y));
