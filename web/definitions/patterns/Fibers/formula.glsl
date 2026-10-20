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
      vec2 q = ref_rot2(uv - 0.5, float(i) * 3.14159265359 / 3.0) * refP0;
      q.x *= max(refP1, 0.002);
      v = max(v, ref_fbmP(q, 3, 0.5));
    }
    return clamp((v - 0.5) * max(refP2, 0.2) + 0.5, 0.0, 1.0);
