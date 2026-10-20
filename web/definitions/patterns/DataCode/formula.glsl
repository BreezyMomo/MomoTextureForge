vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float n = max(floor(refP0), 6.0);
    vec2 g = uv * n;
    vec2 id = floor(g), f = fract(g);
    float m = (id.x < 2.0 && id.y < 2.0)
      ? step(0.25, length(f - 0.5)) * step(length(f - 0.5), 0.46)
      : step(ref_hash1(id + 11.7), refP1);
    return clamp(m, 0.0, 1.0);
