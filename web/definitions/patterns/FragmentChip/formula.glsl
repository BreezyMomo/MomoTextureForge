vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float d = ref_ngonDist(p, floor(max(refP0, 3.0)), refP1);
    float cut = (ref_fbmP(p * refP2, 4, 0.5) - 0.5) * refP3;
    return ref_fillD(d - cut, 0.006);
