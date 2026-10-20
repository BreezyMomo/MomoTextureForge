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
    float d = length(c) - refP1;
    float hole = ref_fillD(d, 0.004);
    float bevel = 1.0 - ref_smoothstep(0.0, max(refP2, 0.002), abs(d));
    return clamp(hole * (1.0 - bevel * 0.75), 0.0, 1.0);
