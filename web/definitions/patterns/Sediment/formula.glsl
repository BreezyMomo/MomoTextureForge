vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float w = (ref_fbmP(uv * vec2(2.0, refP0 * 0.4), 4, 0.5) - 0.5) * refP1;
    float b = uv.y * refP0 + w * refP0 * 0.5;
    float layer = fract(b);
    float shade = 0.35 + 0.65 * ref_hash1(vec2(floor(b), 1.7));
    float edge = abs(layer - 0.5) * 2.0;
    shade *= 0.7 + 0.3 * ref_smoothstep(0.9, 1.0, edge);
    shade += (ref_hash1(floor(uv * 260.0)) - 0.5) * refP3;
    return pow(clamp(shade, 0.0, 1.0), 1.0 / max(refP2, 0.2));
