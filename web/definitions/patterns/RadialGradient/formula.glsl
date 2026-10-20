vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

          // RadialGradient: 半径P0 幂P1
    float d = clamp(length(p) / max(refP0, 0.01), 0.0, 1.0);
    return pow(d, refP1);
