vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_rot2(uv - 0.5, refP1);
    q *= vec2(max(refP0, 0.5), max(refP2, 0.02) * max(refP0, 0.5));
    float v = ref_fbmP(q, 4, 0.5);
    float root = mix(1.0, ref_smoothstep(0.0, 1.0, uv.y), refP3);
    return clamp(v * mix(0.3, 1.0, root) * 1.9, 0.0, 1.0);
