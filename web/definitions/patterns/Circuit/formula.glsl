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
    vec2 ci = floor(q);
    vec2 c = fract(q);
    float w = clamp(refP1, 0.02, 0.48) * 0.5;
    float soft = max(w * 0.5, 0.006);
    vec2 dc = abs(c - 0.5);
    float horiz = 1.0 - ref_smoothstep(w, w + soft, dc.y);
    float vert  = 1.0 - ref_smoothstep(w, w + soft, dc.x);
    float alt = step(0.5, ref_hash1(ci));
    float line = mix(horiz, vert, alt);
    line = max(line, mix(vert, horiz, alt) * step(1.0 - refP2, ref_hash1(ci + 4.7)));
    float node = ref_fillD(max(dc.x, dc.y) - w * 1.8, soft)
               * step(1.0 - refP2 * 0.7, ref_hash1(ci + 9.1));
    return clamp(max(line, node), 0.0, 1.0);
