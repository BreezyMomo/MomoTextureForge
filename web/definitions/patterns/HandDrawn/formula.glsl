vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float base = mix(length(p), max(abs(p.x), abs(p.y)), refP3);
    float j = (ref_fbmP(p * refP2, 3, 0.5) * 2.0 - 1.0) * refP1
            + (ref_turb(p * refP2 * 0.55, 3) - 0.5) * refP1 * 0.7;
    return ref_fillD(base - refP0 + j, 0.006);
