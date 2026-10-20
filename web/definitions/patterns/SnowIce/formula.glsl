vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float sc = max(refP1, 0.5);
    if(refP0 < 0.5){
      float v = ref_fbmS(uv * sc, int(refP2), 0.5);
      return clamp((v - 0.45) * 3.0 * max(refP3, 0.2) + 0.5, 0.0, 1.0);
    }
    vec2 q = uv * sc;
    vec2 ci = floor(q);
    vec2 c = fract(q) - 0.5;
    vec2 r = ref_rot2(c, ref_hash1(ci) * 3.14159265359);
    float band = 1.0 - ref_smoothstep(0.0, 0.085, abs(fract(r.y * 3.0) - 0.5));
    float edge = ref_smoothstep(0.42, 0.5, max(abs(c.x), abs(c.y)));
    return clamp(band * (1.0 - edge) * max(refP3, 0.2) * 1.5, 0.0, 1.0);
