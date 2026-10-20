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
    q.x += mod(floor(q.y), 2.0) * refP3;
    vec2 c = fract(q) - 0.5;
    float d = abs(length(c) - refP1) - refP2;
    return ref_fillD(d, 0.004);
