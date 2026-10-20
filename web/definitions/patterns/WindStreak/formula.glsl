vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = max(refP0, 3.0);
    float gx = uv.x * n;
    float col = floor(gx);
    float lane = fract(gx) - 0.5;
    float w = max(refP2, 0.01);
    float line = 1.0 - ref_smoothstep(w * 0.4, w, abs(lane));
    float seed = ref_hash1(vec2(col, 3.7));
    float len = clamp(refP1, 0.05, 1.0);
    float start = seed * (1.0 - len);
    float endY = start + len;
    float inSpan = ref_smoothstep(start, start + 0.06, uv.y)
                 * (1.0 - ref_smoothstep(endY - 0.06, endY, uv.y));
    return clamp(line * inSpan * pow(clamp(uv.y, 0.0, 1.0), max(refP3, 0.05)) * 1.6, 0.0, 1.0);
