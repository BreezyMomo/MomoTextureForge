vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float a = atan(p.y, p.x);
    float r = length(p);
    float k = floor(max(refP3, 3.0));
    float sharp = max(refP1, 4.0);
    // 主臂：|cos(k·a/2)| 的尖峰 × 径向指数衰减
    float main = pow(max(abs(cos(k * a * 0.5)), 0.0), sharp) * exp(-r / max(refP0, 0.05));
    // 副臂：角向错开半个步距、更短更细（四芒星的斜向短芒）
    float side = pow(max(abs(cos(k * (a + 3.14159265359 / (2.0 * k)) * 0.5)), 0.0), sharp * 1.35) *
                 exp(-r / (max(refP0, 0.05) * 0.55));
    float core = exp(-pow(r / max(refP2, 0.01), 2.0));
    float v = max(max(main, side), core);
    float tw = 0.70 + 0.30 * sin(time * max(refP4, 0.0) * 2.4 + 1.2);
    return clamp(v * mix(1.0, tw, 0.9), 0.0, 1.0);
