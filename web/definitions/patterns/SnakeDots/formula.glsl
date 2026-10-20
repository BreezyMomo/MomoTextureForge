vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    vec2 q = vec2(uv.x * refP3, uv.y * refP0);
    q.x += sin(q.y * 1.1) * refP2;
    vec2 c = fract(q) - 0.5;
    float d = length(vec2(c.x * 0.7, c.y)) - refP1;
    return ref_fillD(d, 0.006);
