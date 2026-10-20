vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = uv - 0.5;
    float r = length(q) + 0.12;
    vec2 w = ref_rot2(q, refP1 / r + time * refP3) + 0.5;
    return ref_fbmP(w * refP0, int(refP2), 0.5);
