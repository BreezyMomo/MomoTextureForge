vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP1;
    q += vec2(ref_fbmP(q * 0.5, 3, 0.5), ref_fbmP(q * 0.5 + 3.3, 3, 0.5)) * 0.6;
    float f = ref_fbmP(q, 5, 0.52);
    float chip = ref_smoothstep(0.62 - refP0 * 0.35, 0.62 - refP0 * 0.35 + refP2, f);
    float gr = ref_hash1(floor(uv * 220.0)) * refP3;
    return clamp(chip + gr + 0.06, 0.0, 1.0);
