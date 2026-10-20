vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float dens = max(refP0, 2.0);
    vec2 q = p * dens;
    vec3 vr = ref_voro2(q, 0.92);
    float edge = vr.y - vr.x;                      // 到细胞边界的近似距离
    float w = max(refP1, 0.005);
    float lead = 1.0 - ref_smoothstep(w, w * (1.0 + max(refP3, 0.2) * 1.4), edge);
    float glass = 1.0 - lead;                      // 铅条压黑、玻璃留白
    float tex = 0.72 + 0.28 * ref_vnoise(q * 2.4 + vec2(1.3, 4.7));
    return clamp(glass * mix(1.0, tex, clamp(refP2, 0.0, 1.0)), 0.0, 1.0);
