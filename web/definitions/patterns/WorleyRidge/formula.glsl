vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec3 vr = ref_voro2(uv * refP0, refP1);
    float e = vr.y - vr.x;
    return pow(clamp(1.0 - e, 0.0, 1.0), max(refP2, 0.2));
