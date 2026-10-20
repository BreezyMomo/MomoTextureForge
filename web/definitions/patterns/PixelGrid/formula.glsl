vec2 p=q,uv=u;
float refP0=a.x;
float refP1=a.y;
float refP2=a.z;
float refP3=a.w;
float refP4=b.x;
float refP5=b.y;
float refP6=b.z;
float refP7=b.w;

         // PixelGrid: 数量P0 间隙P1
    vec2 q = floor(uv * refP0);
    float r = ref_hash1(q);
    vec2 f = fract(uv * refP0);
    float eb = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float m = ref_smoothstep(refP1, refP1 + 0.02, eb);
    return r * m;
