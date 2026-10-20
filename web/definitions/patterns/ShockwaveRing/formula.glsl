vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

    float d = length(p);
    float front = ref_sstepI(0.0, max(refP1, 0.002), abs(d - refP0));
    float tail = pow(clamp(1.0 - (d - refP0) / max(refP2, 0.01), 0.0, 1.0), max(refP3, 0.3));
    tail *= (d >= refP0) ? 1.0 : 0.0;
    return clamp(front + tail, 0.0, 1.0);
