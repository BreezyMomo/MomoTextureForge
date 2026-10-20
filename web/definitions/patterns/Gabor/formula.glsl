vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    return ref_gabor(uv * refP0, max(refP1, 0.05) * 6.0, floor(max(refP2, 1.0)));
