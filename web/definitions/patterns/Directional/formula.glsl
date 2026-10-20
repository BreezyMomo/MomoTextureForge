vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = ref_rot2(uv - 0.5, refP1);
    q.y *= max(refP2, 0.02);
    return ref_fbmP(q * refP0, int(refP3), 0.5);
