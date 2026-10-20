vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float th = clamp(refP1, 0.0, 1.0);
    float v = ref_fbmP(uv * refP0, int(refP2), 0.5);
    float m = ref_smoothstep(th - 0.01, th + 0.01, v);
    return mix(m, 1.0 - m, refP3);
