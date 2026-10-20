vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float y = clamp(uv.y, 0.0, 1.0);
    float x = abs(uv.x - 0.5);
    float sp = max(refP0, 0.05) * 0.5;
    float d = abs(x - sp * y);
    float w = max(refP2, 0.01);
    float band = 1.0 - ref_smoothstep(w * 0.4, w, d);
    float ripple = 0.5 + 0.5 * cos(d * max(refP1, 2.0) * 24.0);
    return clamp(band * mix(1.0, ripple, 0.55) * pow(y, max(refP3, 0.05)) * 1.7, 0.0, 1.0);
