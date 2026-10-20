vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec3 vr = ref_voro2(uv * refP0, 1.0);
    float cells = clamp(1.0 - vr.x * 1.45, 0.0, 1.0);
    float grain = ref_fbmP(uv * refP0 * 7.0, 3, 0.5);
    return clamp((cells * 0.62 + grain * 0.38 * refP1) * max(refP2, 0.2) * 1.4, 0.0, 1.0);
