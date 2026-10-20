vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float f = ref_fbmV(uv * max(refP0, 1.0), 4, 0.55);
    float sc = step(1.0 - refP1, ref_hash1(floor(uv * max(refP2, 40.0)) + 5.1));
    return clamp((f * 0.5 + 0.5) * refP3 + sc * 0.7, 0.0, 1.0);
