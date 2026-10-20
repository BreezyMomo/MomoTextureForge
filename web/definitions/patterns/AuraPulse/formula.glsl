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
    float rings = max(refP0, 1.0);
    float t = fract(time * refP1);
    float ph = fract(r * rings - t * 2.0);
    float ring = 1.0 - ref_smoothstep(0.0, max(refP2, 0.015), abs(ph - 0.5));
    float fade = 1.0 - ref_smoothstep(0.20, 1.0, r);
    float core = 1.0 - ref_smoothstep(0.0, 0.10, r);
    return clamp((ring * fade + core * 0.9) * refP3, 0.0, 1.0);
