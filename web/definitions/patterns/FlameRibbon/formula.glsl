vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float y = clamp(uv.y, 0.0, 1.0);
    float x = uv.x - 0.5;
    /* 头宽尾窄：宽度沿长度收窄，避免整条等宽的死板感 */
    float hw = max(refP2, 0.02) * mix(0.35, 1.0, pow(y, 0.7));
    float lat = 1.0 - ref_smoothstep(hw * 0.35, hw, abs(x));
    /* 纵向拉伸的火焰噪声，向上流动；亮度沿长度加权（头热尾冷） */
    vec2 q = vec2(x * 5.5, y * max(refP0, 1.0) - time * max(refP1, 0.0) * 0.55);
    float n = ref_fbmV(q, 4, 0.55);
    float flame = pow(clamp(n * 1.45, 0.0, 1.0), max(refP3, 0.3));
    return clamp(flame * lat * pow(y, 1.15) * 2.1, 0.0, 1.0);
