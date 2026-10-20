vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

          // Vignette: 起点P0 强度P1
    float d = length(p);
    return clamp(1.0 - ref_smoothstep(refP0, 1.5, d) * refP1, 0.0, 1.0);
