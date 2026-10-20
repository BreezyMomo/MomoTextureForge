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
    q.x += mod(floor(q.y), 2.0) * refP3;
    vec2 c = fract(q);
    float rr = length(c - vec2(0.5, 0.0));
    float d = max(rr - 0.72, -c.y);
    float inner = ref_fillD(d, 0.004);
    float edge = 1.0 - ref_smoothstep(max(refP2, 0.002), max(refP2, 0.002) * 2.0, abs(rr - 0.72));
    float shade = mix(1.0, 0.42 + 0.58 * (1.0 - clamp(rr / 0.72, 0.0, 1.0)), refP1);
    return clamp(inner * (1.0 - edge * 0.92) * shade, 0.0, 1.0);
