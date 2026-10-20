vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float len = max(refP0, 0.06);
    float th = max(refP1, 0.003);
    float ax = abs(p.x), ay = abs(p.y);
    // 横向拉丝：沿 x 指数衰减 × 沿 y 极窄的锐利截面（变形镜头光晕）
    float streak = exp(-ax / len) * exp(-pow(ay / th, 1.35)) * 1.25;
    float core = exp(-pow(length(p) / max(refP2, 0.01), 2.0));
    float v = max(streak, core);
    if(refP3 > 0.02){
      v = max(v, refP3 * exp(-ay / (len * 0.30)) *
                exp(-pow(ax / (th * 1.7), 1.7)));
    }
    return clamp(v, 0.0, 1.0);
