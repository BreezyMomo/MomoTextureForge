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
    q += vec2(ref_fbmP(q * 0.5, 2, 0.5), ref_fbmP(q * 0.5 + 7.7, 2, 0.5)) * refP2 * 2.0;
    vec3 vr = ref_voro2(q, 0.55);
    float e = vr.y - vr.x;
    float grout = 1.0 - ref_smoothstep(0.0, max(refP1, 0.02), e);
    float tone = mix(0.35, 1.0, ref_hash1(floor(q) + 0.31));
    return clamp(grout + (1.0 - grout) * tone * refP3, 0.0, 1.0);
