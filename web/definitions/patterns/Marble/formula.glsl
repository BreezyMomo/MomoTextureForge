vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float w = ref_fbmP(uv * refP0, 5, 0.5) * 2.0 - 1.0;
    float t = fract((uv.x * 1.3 + uv.y * 0.4 + w * refP2) * refP1);
    return pow(clamp(abs(t * 2.0 - 1.0), 0.0, 1.0), 0.65);
