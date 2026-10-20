vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float off = (ref_fbmP(vec2(uv.y * refP1, 3.1 + refP4), 4, 0.5) * 2.0 - 1.0) * refP0;
    float v = 1.0 - ref_smoothstep(refP2 - 0.004, refP2 + 0.004, abs((uv.x - 0.5) + off));
    float nb = floor(max(refP3, 1.0));
    for(int i = 0; i < 10; i++){
      if(float(i) >= nb) break;
      float fi = float(i);
      float y0 = 0.12 + 0.76 * ref_hash1(vec2(fi + refP4, 2.2));
      float dir = (ref_hash1(vec2(fi + refP4, 5.5)) - 0.5) * 2.0;
      float y = uv.y - y0;
      if(y > 0.0 && y < 0.38){
        float x0 = 0.5 - (ref_fbmP(vec2(y0 * refP1, 3.1 + refP4), 4, 0.5) * 2.0 - 1.0) * refP0;
        float along = y / 0.38;
        float bx = x0 + dir * along * 0.26
                 + (ref_fbmP(vec2(uv.y * refP1 * 2.0, fi * 7.0 + refP4), 3, 0.5) * 2.0 - 1.0)
                   * refP0 * 0.5 * along;
        float w = refP2 * 0.7;
        v = max(v, (1.0 - ref_smoothstep(w - 0.003, w + 0.003, abs(uv.x - bx))) * (1.0 - along));
      }
    }
    return clamp(v, 0.0, 1.0);
