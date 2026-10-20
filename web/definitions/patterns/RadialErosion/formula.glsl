vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = length(p) / max(refP0, 0.01);
    float n = ref_fbmP(uv * refP1, 4, 0.5) * 2.0 - 1.0;
    float t = r + n * refP2 * 0.5;
    return clamp(1.0 - ref_smoothstep(1.0 - refP3, 1.0 + refP3, t), 0.0, 1.0);
