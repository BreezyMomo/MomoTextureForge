vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 c = uv - 0.5;
    float r = length(c);
    float w = (ref_fbmP(uv * refP0, 3, 0.5) - 0.5) * refP1;
    float v = fract((r + w) * refP2);
    return pow(clamp(abs(v * 2.0 - 1.0), 0.0, 1.0), max(1.0 - refP3 * 0.95, 0.05))
         * ref_sstepI(0.47, 0.52, r);
