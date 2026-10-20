vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0;
    vec3 vr = ref_voro2(q, refP2);
    float d = (vr.y - vr.x) / max(refP0, 1.0);
    return 1.0 - ref_smoothstep(refP1 * 0.5 - 0.002, refP1 * 0.5 + 0.002, d);
