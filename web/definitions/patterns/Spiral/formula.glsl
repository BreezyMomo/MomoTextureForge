vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

          // Spiral: 圈数P0 线宽P1 速度P2
    float a = atan(p.y, p.x);
    float d = length(p);
    float v = fract(a / 6.28318530718 + d * refP0 - time * refP2);
    float dist = abs(v - 0.5);
    return 1.0 - ref_smoothstep(refP1 * 0.5, refP1 * 0.5 + 0.02, dist);
