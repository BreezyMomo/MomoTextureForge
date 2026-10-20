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
    vec3 vr = ref_voro2(q, 0.9);
    float clump = pow(clamp(1.0 - vr.x * refP1, 0.0, 1.0), 2.0);
    float mask = ref_smoothstep(1.0 - refP2 - 0.25, 1.0 - refP2, ref_fbmP(uv * 2.6, 4, 0.5));
    return clamp(clump * mask * 1.7, 0.0, 1.0);
