vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float r = length(p);
    float a = atan(p.y, p.x);
    float n = floor(max(refP0, 4.0));
    float seg = 6.28318530718 / n;
    float k = floor(a / seg + 0.5);
    float ac = k * seg;
    float w = max(refP3, 0.0015);
    float rmax = max(refP2, 0.12);
    float v = 1.0 - ref_smoothstep(w * 0.5, w, abs(a - ac) * max(r, 0.10));
    float ringN = floor(max(refP1, 1.0));
    for(int i = 0; i < 10; i++){
      if(float(i) >= ringN) break;
      float ri = rmax * (float(i) + 1.0) / ringN;
      v = max(v, 1.0 - ref_smoothstep(w * 0.4, w * 0.9, abs(r - ri)));
    }
    return clamp(v * (1.0 - ref_smoothstep(rmax, rmax + 0.03, r)), 0.0, 1.0);
