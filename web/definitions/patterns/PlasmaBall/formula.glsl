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
    float R = refP0;
    float v = ref_fillD(r - R, 0.01) * 0.22;
    float n = floor(max(refP1, 3.0));
    for(int i = 0; i < 24; i++){
      if(float(i) >= n) break;
      float fi = float(i);
      float a0 = 6.28318530718 * fi / n + time * 0.3 * (ref_hash1(vec2(fi, 1.1)) - 0.5);
      float jit = (ref_fbmP(vec2(r * 4.0, fi * 5.5 + time * 0.4), 3, 0.5) * 2.0 - 1.0) * refP2;
      float d = abs((a - a0 + jit) * max(r, 0.02)) - refP3;
      v = max(v, ref_fillD(d, 0.004) * ((r <= R) ? 1.0 : 0.0) * (0.3 + 0.7 * r / R));
    }
    float glow = exp(-pow(r / (R * 0.55), 2.0)) * 0.85;
    return clamp(max(v, glow), 0.0, 1.0);
