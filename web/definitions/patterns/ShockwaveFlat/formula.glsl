vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float off = (ref_fbmP(uv * 6.0, 3, 0.5) - 0.5) * refP3;
    float x = uv.x + off;
    float v = exp(-pow((x - refP0) / max(refP1, 0.005), 2.0));
    float tail = clamp(1.0 - (x - refP0) / max(refP1 * 7.0, 0.01), 0.0, 1.0) * ((x > refP0) ? 1.0 : 0.0) * 0.35;
    float edge = ref_smoothstep(0.0, 0.08, uv.y) * ref_smoothstep(1.0, 0.9, uv.y);
    return clamp((v + tail) * refP2 * edge, 0.0, 1.0);
