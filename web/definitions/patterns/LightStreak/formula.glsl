vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = p / vec2(max(refP0, 0.01), max(refP1, 0.01));
    float core = pow(clamp(1.0 - length(q), 0.0, 1.0), max(refP2, 0.2));
    float g = exp(-pow(abs(p.y) / max(refP1, 0.01), 1.6));
    g *= pow(clamp(1.0 - abs(p.x) / max(refP0, 0.01), 0.0, 1.0), 1.5);
    return clamp(max(core, g), 0.0, 1.0);
