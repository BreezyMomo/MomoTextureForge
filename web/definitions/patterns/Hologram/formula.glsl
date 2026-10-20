vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float lines = 0.5 + 0.5 * sin(uv.y * refP0 * 6.28318530718);
    float yb = fract(time * refP2);
    float band = exp(-pow((uv.y - yb) / max(refP1, 0.005), 2.0));
    float jit = (ref_hash1(vec2(floor(uv.y * 260.0), floor(time * 14.0))) - 0.5) * refP3;
    return clamp(lines * 0.5 + band * 0.9 + jit, 0.0, 1.0);
