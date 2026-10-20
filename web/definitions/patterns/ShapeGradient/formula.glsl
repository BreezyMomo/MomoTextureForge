vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    int mode = int(floor(refP0 + 0.5));
    float d;
    if(mode == 0){
      d = length(p);
    }else if(mode == 1){
      d = max(abs(p.x), abs(p.y));
    }else if(mode == 2){
      float a = atan(p.y, p.x);
      d = length(p) / max(pow(abs(cos(a * 2.5)), 0.45), 0.15);
    }else{
      d = abs(ref_ngonDist(p, floor(max(refP3, 3.0)), 0.0));
    }
    float t = clamp(d / max(refP1, 0.01), 0.0, 1.0);
    return pow(1.0 - t, max(refP2, 0.2));
