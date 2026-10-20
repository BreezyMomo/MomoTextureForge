vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float th = clamp(refP1, -0.4, 1.4);
    float v = ref_fbmP(uv * refP0, int(refP3), 0.5);
    float body = ref_smoothstep(th - 0.002, th + 0.002, v);
    float edge = 1.0 - ref_smoothstep(0.0, max(refP2, 0.004), abs(v - th));
    return clamp(max(body * 0.7, edge), 0.0, 1.0);
