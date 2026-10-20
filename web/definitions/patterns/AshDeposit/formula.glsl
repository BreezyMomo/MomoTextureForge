vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * max(refP0, 1.0);
    q.y += time * refP3 * 0.15;
    float drift = ref_fbmV(q * 0.7, 3, 0.5);
    float n = ref_fbmV(q + vec2(0.0, drift * 1.2), 4, 0.6);
    float band = 0.5 + 0.5 * sin((uv.y * refP1 + n * 2.2) * 6.28318530718);
    float dust = pow(clamp(band, 0.0, 1.0), max(refP2, 0.3));
    float spec = step(1.0 - 0.06, ref_hash1(floor(uv * 90.0) + floor(time * 1.5)));
    return clamp(dust * 0.7 + spec * 0.5, 0.0, 1.0);
