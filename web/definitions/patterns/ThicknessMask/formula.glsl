vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    int shape = int(floor(refP0 + 0.5));
    float d;
    if(shape == 0)      d = length(p) - refP1;
    else if(shape == 1) d = ref_sdBox(p, vec2(refP1));
    else if(shape == 2) d = ref_ngonDist(p, floor(max(refP3, 3.0)), refP1);
    else {
      float a = atan(p.y, p.x);
      d = length(p) - refP1 * (0.5 + 0.5 * abs(cos(a * 2.5)));
    }
    float t = clamp(-d / max(refP1, 0.001), 0.0, 1.0);
    return pow(t, max(refP2, 0.2));
