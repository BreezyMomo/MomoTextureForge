vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_warp(uv * refP0, refP2, 1.0);
    float v = 0.0, amp = 1.0;
    for(int i = 0; i < 4; i++){
      if(float(i) >= floor(refP1)) break;
      v += abs(ref_fbmP(q, 3, 0.5) - 0.5) * 2.0 * amp;
      q *= 2.03;
      amp *= 0.6;
    }
    return pow(clamp(1.0 - v * 0.5, 0.0, 1.0), max(refP3, 0.3));
