vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec3 vr = ref_voro2(uv * refP0, refP2);
    float h = 1.0 - clamp(vr.x * 1.7, 0.0, 1.0);
    return pow(h, max(refP1, 0.2));
