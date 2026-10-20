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
    q += vec2(ref_fbmP(q * 0.7, 3, 0.5), ref_fbmP(q * 0.7 + 9.3, 3, 0.5)) * refP3;
    vec3 vr = ref_voro2(q, 0.9);
    float e = vr.y - vr.x;
    float crack = 1.0 - ref_smoothstep(0.0, max(refP1, 0.015), e);
    float cell = ref_hash1(floor(q) + 3.71);
    float surf = 0.45 + 0.55 * cell;
    return clamp(crack + surf * (1.0 - crack) * refP2, 0.0, 1.0);
