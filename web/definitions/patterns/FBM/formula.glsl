vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

         // FBM: 缩放P0 八度P1 增益P2
    return ref_fbmG(uv * refP0, int(refP1), refP2);
