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
    float e = (vr.y - vr.x) / max(vr.y, 1e-4);
    return clamp(e / max(refP2, 0.01), 0.0, 1.0);
