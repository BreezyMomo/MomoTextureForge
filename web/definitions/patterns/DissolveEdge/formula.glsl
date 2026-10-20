vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float v = ref_fbmP(uv * refP0, int(refP3), 0.5);
    return clamp(1.0 - ref_smoothstep(0.0, max(refP2, 0.002), abs(v - refP1)), 0.0, 1.0);
