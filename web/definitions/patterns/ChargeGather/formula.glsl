vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 c = uv - 0.5;
    float r = length(c) * 2.0;
    float a = atan(c.y, c.x);
    float st = ref_snoise(vec2(cos(a), sin(a)) * refP1 + vec2(0.0, r * 3.0 - time * refP2 * 2.0));
    st = pow(clamp(st * 0.5 + 0.5, 0.0, 1.0), 2.0);
    float core = ref_sstepI(0.0, max(refP3, 0.05), r);
    float halo = pow(clamp(1.0 - r, 0.0, 1.0), 1.5) * 0.3;
    return clamp((st * pow(clamp(1.0 - r, 0.0, 1.0), 1.2) * 1.5 + core * 0.9 + halo) * refP0 * 0.7, 0.0, 1.0);
