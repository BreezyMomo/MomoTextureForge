vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 g = uv * vec2(max(refP0, 1.0), max(refP1, 1.0));
    vec2 f = fract(g) - 0.5;
    float d = ref_sdBox(f, vec2(0.42, 0.13)) - 0.05;
    float slat = ref_fillD(d, 0.012);
    float shade = mix(1.0, 0.3, ref_smoothstep(-0.14, 0.14, f.y) * refP2);
    float fr = ref_strokeD(ref_sdBox(f, vec2(0.46)), 0.008, 0.01) * refP3;
    return clamp(slat * shade + fr, 0.0, 1.0);
