vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0 + vec2(time * refP2 * 0.6, time * refP2 * 0.35);
    vec3 vr = ref_voro2(q, 1.0);
    float e = vr.y - vr.x;
    return pow(clamp(1.0 - e * 2.6, 0.0, 1.0), max(refP1, 0.3));
