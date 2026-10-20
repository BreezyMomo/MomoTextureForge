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
    float hold = clamp(refP2, 0.0, 0.85);
    float base = clamp(y / max(hold + 0.02, 0.03), 0.0, 1.0);
    float along = mix(pow(base, max(refP0, 0.05)), 1.0, ref_smoothstep(hold - 0.02, hold + 0.09, y));
    float hw = max(refP3, 0.02);
    float lat = 1.0 - ref_smoothstep(hw, hw + max(refP1, 0.01), abs(uv.x - 0.5));
    return clamp(lat * along, 0.0, 1.0);
