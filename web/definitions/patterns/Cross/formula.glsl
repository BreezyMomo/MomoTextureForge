vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

         // Cross: 臂宽P0 臂长P1 羽化P2
    float d = min(ref_sdSeg(p, vec2(-refP1, 0.0), vec2(refP1, 0.0)),
                  ref_sdSeg(p, vec2(0.0, -refP1), vec2(0.0, refP1)));
    d -= refP0;
    return 1.0 - ref_smoothstep(-refP2, refP2, d);
