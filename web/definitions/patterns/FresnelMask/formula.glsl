vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float R = max(refP0, 0.01);
    float r = clamp(length(p) / R, 0.0, 1.0);
    float nz = sqrt(max(1.0 - r * r, 0.0));
    float f = 1.0 - nz;
    float v = ref_smoothstep(0.0, max(refP1, 0.005) + 0.001, f);
    return pow(clamp(v, 0.0, 1.0), max(refP2, 0.2)) * ((length(p) <= R) ? 1.0 : 0.0);
