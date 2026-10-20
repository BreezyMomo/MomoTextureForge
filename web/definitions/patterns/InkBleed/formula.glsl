vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float acc = 0.0;
    for(int i = 0; i < 6; i++){
      float fi = float(i);
      vec2 cp = vec2(ref_hash1(vec2(fi, 1.3)), ref_hash1(vec2(fi, 7.7)));
      float rr = 0.06 + ref_hash1(vec2(fi, 3.9)) * 0.13;
      vec2 w = (vec2(ref_fbmP(uv * 4.0 + fi, 3, 0.5), ref_fbmP(uv * 4.0 + fi + 5.0, 3, 0.5)) - 0.5) * refP1;
      float d = length(uv - cp - w * 0.4);
      acc += ref_smoothstep(rr + refP1 * 0.18, rr * 0.4, d);
    }
    acc = clamp(acc, 0.0, 1.0);
    float fl = step(1.0 - refP3 * 0.35, ref_hash1(floor(uv * 190.0) + 2.2));
    return pow(acc, max(refP2, 0.2)) * (1.0 - fl * 0.6) ;
