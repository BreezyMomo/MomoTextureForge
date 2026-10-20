vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

          // Sunburst: 数量P0 锐度P1 旋转P2 衰减P3
    float a = atan(p.y, p.x) + refP2;
    float ray = pow(abs(sin(a * refP0 * 0.5)), refP1);
    float fall = 1.0 - ref_smoothstep(refP3, 1.45, length(p));
    return ray * fall;
