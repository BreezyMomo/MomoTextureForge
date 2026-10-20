vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

         // VoronoiCells: 缩放P0 扰动P1 反转P2
    vec3 vr = ref_voro2(uv * refP0, refP1);
    float d = clamp(vr.x, 0.0, 1.0);
    return mix(d, 1.0 - d, refP2);
