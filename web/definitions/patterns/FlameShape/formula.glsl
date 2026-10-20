vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float y = uv.y;
    float h = max(refP0, 0.05);
    float w = refP1 * pow(clamp(1.0 - y / h, 0.0, 1.0), 0.62);
    float tear = (ref_fbmP(vec2(uv.x * refP3, y * refP3 * 1.4 - time * 1.1), 4, 0.5) - 0.5) * refP2;
    float d = abs(uv.x - 0.5) - w + tear * (y / h) * 0.9;
    float v = ref_fillD(d, 0.02) * ((y <= h) ? 1.0 : 0.0);
    return clamp(v * (1.0 - ref_smoothstep(h * 0.55, h, y) * 0.6), 0.0, 1.0);
