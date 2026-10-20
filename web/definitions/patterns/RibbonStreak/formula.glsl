vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = max(refP0, 2.0);
    float lane = fract(uv.x * n) - 0.5;
    float w = max(refP1, 0.02);
    float line = 1.0 - ref_smoothstep(w * 0.45, w, abs(lane));
    float pulse = 0.5 + 0.5 * sin((uv.y * 3.2 - time * max(refP2, 0.0) * 0.85) * 6.28318530718);
    float along = pow(clamp(uv.y, 0.0, 1.0), max(refP3, 0.05));
    return clamp(line * (0.45 + 0.75 * pulse) * along * 1.25, 0.0, 1.0);
