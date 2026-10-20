vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

         // Crescent: 半径P0 偏移P1 羽化P2
    float d1 = length(p) - refP0;
    float d2 = length(p - vec2(refP1 * 0.6, 0.0)) - refP0;
    float d = max(d1, -d2);
    return 1.0 - ref_smoothstep(-refP2, refP2, d);
