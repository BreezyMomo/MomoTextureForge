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
    float ring = ref_fillD(abs(r - refP0) - refP1 * 0.5, 0.006);
    float n = floor(max(refP2, 1.0));
    float gap = 1.0;
    if(n > 1.0){
      float g = fract(a / 6.28318530718 * n + time * refP3);
      gap = step(0.3, g);
    }
    return clamp(ring * mix(1.0, gap, 0.9), 0.0, 1.0);
