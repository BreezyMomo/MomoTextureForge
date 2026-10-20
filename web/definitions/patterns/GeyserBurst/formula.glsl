vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 c = uv - 0.5;
    float cyc = fract(time / max(refP0, 0.3) + 0.25);
    float burst = ref_smoothstep(0.0, 0.12, cyc) * (1.0 - ref_smoothstep(0.6, 1.0, cyc));
    float h = cyc * 1.6;
    float col = 1.0 - ref_smoothstep(refP1 * 0.5, refP1 * 0.5 + 0.05 + refP3 * 0.15, abs(c.x));
    col *= ref_smoothstep(h + 0.3, h - 0.25, uv.y);
    float part = 0.0;
    for(int i = 0; i < 5; i++){
      float fi = float(i);
      float py = fract(ref_hash1(vec2(fi, 2.9)) + cyc * refP2 * 0.5);
      vec2 pp = vec2((ref_hash1(vec2(fi, 6.1)) - 0.5) * refP3 * 0.8 * py, 0.55 + py * 0.5);
      part += (1.0 - ref_smoothstep(0.0, 0.05 + refP3 * 0.08, length(uv - pp - vec2(0.0, -0.5)))) * (1.0 - py);
    }
    return clamp((col * burst + part * burst * 0.8), 0.0, 1.0);
