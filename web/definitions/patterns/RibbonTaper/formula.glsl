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
    float w = mix(max(refP1, 0.004), max(refP0, 0.004), pow(y, max(refP2, 0.05)));
    float so = max(refP3, 0.01);
    float lat = 1.0 - ref_smoothstep(max(w - so * 0.9, 0.001), w + so, abs(uv.x - 0.5));
    return clamp(lat, 0.0, 1.0);
