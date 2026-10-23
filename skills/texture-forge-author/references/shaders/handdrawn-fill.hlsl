// Momo Texture Forge reference shader, version 1. No Rough.js code is used here.
// UV origin is bottom-left. Sizes are measured in design pixels, not screen pixels.
#ifndef MOMO_HANDDRAWN_FILL_INCLUDED
#define MOMO_HANDDRAWN_FILL_INCLUDED
struct MFHanddrawnParams {
    float style;
    float gap;
    float width;
    float angle;
    float roughness;
    float seed;
    float dashLength;
    float dashGap;
    float inkOpacity;
    float paperOpacity;
    float2 scroll;
    float2 designSize;
    float3 inkColor;
    float3 paperColor;
};
float MFHash(float2 p) {
    float3 q = frac(float3(p.x, p.y, p.x) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return frac((q.x + q.y) * q.z);
}
float MFSoftStroke(float distanceToLine, float width) {
    float aa = max(fwidth(distanceToLine), 0.35);
    return 1.0 - smoothstep(width * 0.5 - aa, width * 0.5 + aa, distanceToLine);
}
float MFHatch(float2 p, MFHanddrawnParams v, float zigzag) {
    float gap = max(v.gap, 2.0);
    float seed = fmod(v.seed, 1009.0);
    float wobble = sin(p.x * 0.055 + seed * 0.13) * 1.5
                 + sin(p.x * 0.2 + seed) * 0.4;
    float teeth = (abs(frac(p.x / (gap * 2.0)) - 0.5) * 2.0 - 0.5) * gap * 0.6;
    float y = p.y + wobble * v.roughness + teeth * zigzag;
    float distanceToLine = abs(frac(y / gap + 0.5) - 0.5) * gap;
    return MFSoftStroke(distanceToLine, v.width);
}
// mask is a linear coverage value read from the red channel of a clamp-sampled texture.
// Colors and the returned straight RGB are linear. Multiply RGB by A for premultiplied blending.
float4 MFHanddrawnFill(float2 uv, float mask, float timeSeconds, MFHanddrawnParams v) {
    float2 p = (uv - 0.5) * max(v.designSize, float2(1.0, 1.0)) + v.scroll * timeSeconds;
    float angle = v.angle * 0.017453292519943295;
    float2 rotated = float2(cos(angle) * p.x + sin(angle) * p.y,
                          -sin(angle) * p.x + cos(angle) * p.y);
    float gap = max(v.gap, 2.0);
    float pattern = 1.0;
    if (v.style > 0.5 && v.style < 2.5) {
        pattern = MFHatch(rotated, v, 0.0);
        if (v.style > 1.5) pattern = 1.0 - (1.0 - pattern) * (1.0 - MFHatch(rotated.yx, v, 0.0));
    }
    if (v.style > 2.5 && v.style < 3.5) {
        float2 cell = floor(rotated / gap);
        float seed = fmod(v.seed, 1009.0);
        float2 jitter = float2(MFHash(cell + seed), MFHash(cell + seed + 19.0)) - 0.5;
        float2 local = (frac(rotated / gap) - 0.5) * gap - jitter * gap * v.roughness * 0.45;
        pattern = MFSoftStroke(length(local), v.width * 2.0);
    }
    if (v.style > 3.5 && v.style < 4.5) {
        float period = max(v.dashLength + v.dashGap, 1.0);
        float along = frac((rotated.x + floor(rotated.y / gap + 0.5) * period * 0.37) / period) * period;
        float aa = max(fwidth(rotated.x), 0.35);
        float dash = smoothstep(0.0, aa, along) * (1.0 - smoothstep(v.dashLength - aa, v.dashLength, along));
        pattern = MFHatch(rotated, v, 0.0) * dash;
    }
    if (v.style > 4.5) pattern = MFHatch(rotated, v, 1.0);
    float ink = saturate(pattern * v.inkOpacity);
    float paper = saturate(v.paperOpacity) * (1.0 - ink);
    float coverage = ink + paper;
    float3 rgb = (v.inkColor * ink + v.paperColor * paper) / max(coverage, 0.000001);
    return float4(rgb, saturate(mask) * coverage);
}
#endif
