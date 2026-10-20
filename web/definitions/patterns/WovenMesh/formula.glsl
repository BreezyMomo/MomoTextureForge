vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float v = 0.0;
    for(int i = 0; i < 3; i++){
      vec2 q = ref_rot2(uv - 0.5, float(i) * 3.14159265359 / 3.0);
      float s = abs(fract(q.y * refP0) - 0.5) * 2.0;
      v = max(v, ref_smoothstep(1.0 - min(refP1, 0.99), 1.0, s));
    }
    return v;
