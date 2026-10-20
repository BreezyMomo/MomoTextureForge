vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float a = atan(p.y, p.x);
    float len = refP2 / (1.0 + max(refP1, 0.2) * 2.0 * abs(sin(a * floor(max(refP0, 3.0)) * 0.5)));
    float star = ref_fillD(length(p) - len, refP3);
    float halo = exp(-dot(p,p) / max(refP2 * refP2 * 0.0169, 0.0001)) * 0.65;
    return max(star, halo);
