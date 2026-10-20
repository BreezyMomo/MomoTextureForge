vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float t = clamp((p.y + refP2) / (2.0 * max(refP2, 0.01)), 0.0, 1.0);
    float hw = mix(refP1, refP0, t);
    float body = max(abs(p.x) - hw, -p.y - refP2);
    if(refP3 > 0.001){
      float R = (refP0 * refP0 + refP3 * refP3) / (2.0 * refP3);
      float dc = length(p - vec2(0.0, refP2 - refP3 + R)) - R;
      body = max(body, min(p.y - refP2, dc));
    }else{
      body = max(body, p.y - refP2);
    }
    return ref_fillD(body, refP4);
