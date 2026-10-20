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
    vec3 vr = ref_voro2(q, 0.85);
    float peb = 1.0 - ref_smoothstep(refP2 - max(refP1, 0.02), refP2 + max(refP1, 0.02), vr.x);
    float shade = 1.0 - vr.x * refP3;
    return clamp(peb * clamp(shade, 0.0, 1.0), 0.0, 1.0);
