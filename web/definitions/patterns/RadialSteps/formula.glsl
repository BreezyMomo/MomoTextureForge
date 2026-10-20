vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = clamp(length(p) / 1.3, 0.0, 1.0);
    float steps = max(floor(refP0), 2.0);
    float x = r * steps;
    float q = floor(x) + ref_smoothstep(1.0 - clamp(refP1, 0.0, 0.98), 1.0, fract(x));
    float t = clamp(q / steps, 0.0, 1.0);
    return mix(t, 1.0 - t, refP2);
