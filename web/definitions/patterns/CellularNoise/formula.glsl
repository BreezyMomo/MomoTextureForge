vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * max(refP0, 2.0);
    vec3 vr = ref_voro2(q, max(refP3, 0.2));
    float v = mix(clamp(vr.x, 0.0, 1.0), clamp(vr.y - vr.x, 0.0, 1.0), clamp(refP2, 0.0, 1.0));
    return clamp(pow(v, max(refP1, 0.25)), 0.0, 1.0);
