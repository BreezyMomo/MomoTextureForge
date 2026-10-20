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
    q += vec2(ref_fbmP(q * 0.6 + time * 0.3, 3, 0.5), ref_fbmP(q * 0.6 + 4.4 - time * 0.25, 3, 0.5));
    float n = ref_ridged(q * refP2 * 0.4, 4, 0.55);
    float flick = 0.55 + 0.45 * sin(time * refP1 * 6.2832 + n * 9.0);
    return pow(clamp(n * flick, 0.0, 1.0), max(refP3 * 0.5, 0.2));
