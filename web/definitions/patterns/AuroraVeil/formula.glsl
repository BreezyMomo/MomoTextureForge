vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    if(refP4 > 0.5){
        // A curved foot with vertically coherent light rays, fading into the upper curtain.
        float drift = time * refP1 * 0.18;
        float x = uv.x * max(refP0, 1.0);
        float bend = sin(x * 2.4 + drift) * 0.035
                   + (ref_fbmS(vec2(x * 0.6 + drift, 4.7), 3, 0.5) - 0.5) * 0.12;
        float height = uv.y - refP5 - bend;
        float reach = max(refP6, 0.1);
        float envelope = ref_smoothstep(-0.015, 0.025, height)
                       * (1.0 - ref_smoothstep(reach * 0.12, reach, height));
        float rayX = uv.x * max(refP7, 8.0) + sin(uv.y * 2.0 + drift) * 0.5;
        float rays = ref_fbmS(vec2(rayX, uv.y * max(refP2, 0.5) * 0.15 + drift), 3, 0.5);
        float broad = ref_fbmS(vec2(x + drift, uv.y * 0.4), 3, 0.5);
        float light = pow(clamp(rays * 0.85 + broad * 0.35, 0.0, 1.0), max(refP3, 0.4));
        float foot = exp(-abs(height - 0.015) / 0.018) * 0.25;
        float sides = ref_smoothstep(0.0, 0.08, uv.x) * (1.0 - ref_smoothstep(0.92, 1.0, uv.x));
        return clamp((light * envelope + foot) * sides, 0.0, 1.0);
    }

    vec2 q = uv * vec2(max(refP0, 1.0) * 1.6, max(refP0, 1.0) * 0.5);
    q.x += time * refP1 * 0.35;
    float n1 = ref_fbmS(q, 4, 0.55);
    float n2 = ref_fbmS(q * 1.7 + 3.3, 3, 0.55);
    float curtain = 0.5 + 0.5 * sin((uv.y * refP2 + n1 * 3.0 + n2 * 1.5) * 6.28318530718);
    float v = pow(clamp(curtain, 0.0, 1.0), max(refP3, 0.4));
    return clamp(v * (0.55 + 0.45 * n1) * 1.5, 0.0, 1.0);
