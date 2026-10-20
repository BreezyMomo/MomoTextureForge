vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_rot2(p, -refP3);
    float d = ref_ngonDist(q, floor(max(refP1, 3.0)), refP0);
    return clamp(-d / max(refP2, 0.001), 0.0, 1.0);
