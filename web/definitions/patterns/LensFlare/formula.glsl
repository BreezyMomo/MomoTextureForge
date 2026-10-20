vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

          // LensFlare: 半径P0 光条长P1 柔和P2
    float d = length(p);
    float core2 = 1.0 - ref_smoothstep(refP0 - refP2, refP0 + refP2, d);
    float hx = 1.0 - ref_smoothstep(0.0, refP2 * 1.5, abs(p.y));
    hx *= 1.0 - ref_smoothstep(refP1, refP1 + 0.05, abs(p.x));
    float hy = 1.0 - ref_smoothstep(0.0, refP2 * 1.5, abs(p.x));
    hy *= 1.0 - ref_smoothstep(refP1, refP1 + 0.05, abs(p.y));
    return clamp(core2 + hx * 0.9 + hy * 0.9, 0.0, 1.0);
