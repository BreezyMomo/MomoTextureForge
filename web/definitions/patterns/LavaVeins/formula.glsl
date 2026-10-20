vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv * refP0;
    q.y -= time * refP3 * 0.25;
    float r = ref_ridged(ref_warp(q, refP1, 1.0), int(refP2), 0.5);
    return pow(clamp(r, 0.0, 1.0), 1.4);
