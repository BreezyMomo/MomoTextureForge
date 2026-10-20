vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP1 / 100.0;
    float g = ref_hash1(floor(uv * refP1) + 0.37);
    float ref_warp = (ref_fbmP(uv * 3.0 + 7.1, 4, 0.5) - 0.5) * refP3;
    float rust = ref_fbmP(vec2(uv.x + ref_warp, uv.y * 0.6) * 5.0, 5, 0.55);
    float pits = ref_smoothstep(0.35, 0.75, rust) * refP0 + g * 0.12 * refP0;
    float base = 1.0 - refP2 * ref_smoothstep(0.5, 0.9, ref_fbmP(uv * refP1 * 0.05, 3, 0.5));
    return clamp(base - pits, 0.0, 1.0);
