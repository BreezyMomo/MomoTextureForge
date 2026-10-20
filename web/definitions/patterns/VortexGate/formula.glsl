vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = length(p);
    float a = atan(p.y, p.x);
    float arms = floor(max(refP0, 1.0));
    float rc = max(refP4, 0.02);
    float s = (a / 6.28318530718) * arms + log(max(r, rc * 0.4)) * max(refP2, 0.5)
              - time * max(refP3, 0.0);
    float ph = fract(s);
    float edge = min(ph, 1.0 - ph);
    float band = 1.0 - ref_smoothstep(0.0, max(refP1, 0.01), edge);
    float rad = ref_smoothstep(0.02, rc * 0.7, r) * (1.0 - ref_smoothstep(0.86, 1.0, r));
    float core = 1.0 - ref_smoothstep(0.0, rc * 1.5, r);
    return clamp(max(band * rad, core), 0.0, 1.0);
