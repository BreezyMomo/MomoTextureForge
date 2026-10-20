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
    float grow = 1.0 + (1.0 - y) * 1.5;
    vec2 q = vec2((uv.x - 0.5) * 3.4 * grow,
                  y * max(refP0, 1.0) - time * max(refP1, 0.0) * 0.3);
    float n = ref_fbmV(q, 5, 0.55);
    float body = ref_smoothstep(0.60 - max(refP2, 0.1) * 0.22, 0.72, n);
    float along = pow(max(y, 0.02), mix(2.0, 0.5, clamp(refP3, 0.0, 1.0)));
    /* 横向羽化：左右各留约 18% 渐隐，避免 Ribbon 拉伸后出现硬边 */
    float lat = 1.0 - ref_smoothstep(0.32, 0.50, abs(uv.x - 0.5));
    return clamp(body * along * lat * 1.5, 0.0, 1.0);
