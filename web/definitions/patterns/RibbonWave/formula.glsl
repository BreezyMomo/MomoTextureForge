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
    float hw = max(refP2, 0.02);
    float lat = 1.0 - ref_smoothstep(hw * 0.4, hw, x);
    float core = 1.0 - ref_smoothstep(0.0, max(hw * 0.35, 0.01), x);
    float ph = fract(y * max(refP0, 1.0) - time * max(refP1, 0.0) * 0.35);
    float wave = 0.5 + 0.5 * sin(ph * 6.28318530718);
    float modu = mix(1.0, wave, clamp(refP3, 0.0, 1.0));
    return clamp((core + lat * 0.5) * modu * pow(y, 0.9) * 1.35, 0.0, 1.0);
