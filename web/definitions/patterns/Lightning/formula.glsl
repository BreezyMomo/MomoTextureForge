vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float off = (ref_fbmP(vec2(uv.y * refP1, refP3 + time * refP4), 4, 0.5) * 2.0 - 1.0) * refP0;
    float d = abs((uv.x - 0.5) + off);
    return 1.0 - ref_smoothstep(refP2 - 0.004, refP2 + 0.004, d);
