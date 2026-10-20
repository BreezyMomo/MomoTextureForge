vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float w = refP1 / max(refP0, 1.0) * 0.5;
    float v = 0.0;
    for(int i = 0; i < 3; i++){
      vec2 r = ref_rot2(uv * refP0, float(i) * 3.14159265359 / 6.0);
      vec2 c = abs(fract(r) - 0.5);
      float dSq  = (0.5 - max(c.x, c.y)) / max(refP0, 1.0);
      float dDia = (0.5 - (c.x + c.y)) / max(refP0, 1.0);
      v = max(v, 1.0 - ref_smoothstep(w - 0.002, w + 0.002, dSq));
      v = max(v, 1.0 - ref_smoothstep(w - 0.002, w + 0.002, dDia));
    }
    return v;
