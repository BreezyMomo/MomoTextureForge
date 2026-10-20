float ref_smoothstep(float a,float b,float x);
vec2 ref_smoothstep(vec2 a,vec2 b,vec2 x);
vec2 ref_smoothstep(float a,float b,vec2 x);
vec3 ref_smoothstep(vec3 a,vec3 b,vec3 x);
vec2 ref_rot2(vec2 p, float a);
float ref_cross2(vec2 a, vec2 b);
float ref_sstepW(float center, float halfw, float x);
float ref_sstepI(float e0, float e1, float x);
float ref_fillD(float d, float soft);
float ref_strokeD(float d, float w, float soft);
float ref_angWin(float a, float a0, float halfw);
float ref_smin(float a, float b, float k);
float ref_smax(float a, float b, float k);
float ref_sdSeg(vec2 p, vec2 a, vec2 b);
float ref_sdBox(vec2 p, vec2 b);
float ref_sdCircle(vec2 p, float r);
float ref_ngonDist(vec2 p, float n, float r);
float ref_hexDist(vec2 p);
vec2 ref_hexCell(vec2 p);
float ref_sdfFromImplicit(float f);
float ref_hash1(vec2 p);
vec2 ref_hash2(vec2 p);
vec2 ref_hash2s(vec2 p);
float ref_perlin(vec2 p);
float ref_billow(vec2 p, int oct, float gain);
float ref_fbmP(vec2 p, int oct, float gain);
vec2 ref_curlN(vec2 p, float eps);
float ref_vnoise(vec2 p);
float ref_fbmG(vec2 p, int oct, float gain);
vec3 ref_permute3(vec3 x);
float ref_snoise(vec2 v);
float ref_fbmS(vec2 p, int oct, float gain);
float ref_fbmV(vec2 p, int oct, float gain);
float ref_gabor(vec2 p, float freq, float dirs);
float ref_ridged(vec2 p, int oct, float gain);
float ref_turb(vec2 p, int oct);
vec3 ref_voro2(vec2 p, float j);
vec2 ref_warp(vec2 p, float amp, float freq);
float ref_smoothstep(float a,float b,float x){if(a==b)return step(a,x);float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
vec2 ref_smoothstep(vec2 a,vec2 b,vec2 x){return vec2(ref_smoothstep(a.x,b.x,x.x),ref_smoothstep(a.y,b.y,x.y));}
vec2 ref_smoothstep(float a,float b,vec2 x){return ref_smoothstep(vec2(a),vec2(b),x);}
vec3 ref_smoothstep(vec3 a,vec3 b,vec3 x){return vec3(ref_smoothstep(a.x,b.x,x.x),ref_smoothstep(a.y,b.y,x.y),ref_smoothstep(a.z,b.z,x.z));}

vec2 ref_rot2(vec2 p, float a){
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c) * p;   // 列主序：此写法为逆时针旋转
}
float ref_cross2(vec2 a, vec2 b){ return a.x * b.y - a.y * b.x; }
float ref_sstepW(float center, float halfw, float x){
  float hw = max(halfw, 0.002);
  return ref_smoothstep(center - hw, center + hw, x);
}
float ref_sstepI(float e0, float e1, float x){
  float lo = min(e0, e1), hi = max(e0, e1);
  if(hi - lo < 0.002) hi = lo + 0.002;
  return 1.0 - ref_smoothstep(lo, hi, x);
}
float ref_fillD(float d, float soft){
  return 1.0 - ref_smoothstep(-max(soft, 0.0008), max(soft, 0.0008), d);
}
float ref_strokeD(float d, float w, float soft){
  // 带状描边：|d| < w 内为 1，向外按 soft 羽化（旧实现误作向内填充，
  // 会导致 HUD 框线内部残留 0.5 灰底、Truchet 线条发灰）
  float hw = max(w, 0.0008);
  float so = max(soft, 0.0006);
  return 1.0 - ref_smoothstep(hw - so, hw + so, abs(d));
}
float ref_angWin(float a, float a0, float halfw){
  float d = abs(mod(a - a0 + 3.14159265359 * 3.0, 6.28318530718) - 3.14159265359);
  return ref_sstepI(0.0, max(halfw, 0.0008), d);
}
float ref_smin(float a, float b, float k){
  k = max(k, 1e-4);
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float ref_smax(float a, float b, float k){ return -ref_smin(-a, -b, k); }
float ref_sdSeg(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
float ref_sdBox(vec2 p, vec2 b){
  vec2 d = abs(p) - b;
  return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0);
}
float ref_sdCircle(vec2 p, float r){ return length(p) - r; }
float ref_ngonDist(vec2 p, float n, float r){
  float a = atan(p.x, p.y);
  float seg = 6.28318530718 / max(n, 3.0);
  return cos(floor(0.5 + a / seg) * seg - a) * length(p) - r;
}
float ref_hexDist(vec2 p){
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}
vec2 ref_hexCell(vec2 p){
  vec2 s = vec2(1.0, 1.7320508);
  vec2 h = s * 0.5;
  vec2 a = mod(p, s) - h;
  vec2 b = mod(p - h, s) - h;
  return dot(a, a) < dot(b, b) ? a : b;
}
float ref_sdfFromImplicit(float f){
  float g = length(vec2(dFdx(f), dFdy(f)));
  float px = 2.0 / min(imageSize.x, imageSize.y);
  return f / max(g, 1e-6) * px;
}


float ref_hash1(vec2 p){
  // Dave Hoskins hash12 —— 旧版在小整数格点上 (0,0)(1,0)(0,1)(1,1) 全部 < 0.5，
  // 会让「数量=2~4」的格子类图案整片空白
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}


vec2 ref_hash2(vec2 p){
  float n = ref_hash1(p);
  return vec2(n, ref_hash1(p + n + 17.17));
}


vec2 ref_hash2s(vec2 p){ return ref_hash2(p) * 2.0 - 1.0; }


float ref_perlin(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(ref_hash2s(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
  float b = dot(ref_hash2s(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(ref_hash2s(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(ref_hash2s(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  float v = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  return clamp(v * 0.7 + 0.5, 0.0, 1.0);
}


float ref_billow(vec2 p, int oct, float gain){
  float v = 0.0, amp = 0.5, tot = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    v += amp * abs(ref_perlin(p) * 2.0 - 1.0);
    tot += amp;
    p = p * 2.02 + vec2(7.7, 2.9);
    amp *= gain;
  }
  return clamp(v / max(tot, 1e-4), 0.0, 1.0);
}


float ref_fbmP(vec2 p, int oct, float gain){
  float v = 0.0, amp = 0.5, tot = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    v += amp * ref_perlin(p);
    tot += amp;
    p = p * 2.01 + vec2(5.2, 1.3);
    amp *= gain;
  }
  return v / max(tot, 1e-4);
}


vec2 ref_curlN(vec2 p, float eps){
  float a = ref_fbmP(p + vec2(0.0, eps), 4, 0.5);
  float b = ref_fbmP(p - vec2(0.0, eps), 4, 0.5);
  float c = ref_fbmP(p + vec2(eps, 0.0), 4, 0.5);
  float d = ref_fbmP(p - vec2(eps, 0.0), 4, 0.5);
  return vec2(a - b, -(c - d)) / (2.0 * eps);
}


float ref_vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = ref_hash1(i);
  float b = ref_hash1(i + vec2(1.0, 0.0));
  float c = ref_hash1(i + vec2(0.0, 1.0));
  float d = ref_hash1(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}


float ref_fbmG(vec2 p, int oct, float gain){
  float v = 0.0, amp = 0.5;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    v += amp * ref_vnoise(p);
    p = p * 2.03 + vec2(11.7, 7.3);
    amp *= gain;
  }
  return v;
}


vec3 ref_permute3(vec3 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }


float ref_snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = ref_permute3(ref_permute3(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return clamp(130.0 * dot(m, g) * 0.5 + 0.5, 0.0, 1.0);
}


float ref_fbmS(vec2 p, int oct, float gain){
  float v = 0.0, amp = 0.5, tot = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    v += amp * ref_snoise(p);
    tot += amp;
    p = p * 2.02 + vec2(3.7, 9.1);
    amp *= gain;
  }
  return v / max(tot, 1e-4);
}


float ref_fbmV(vec2 p, int oct, float gain){
  float v = 0.0, amp = 0.5, tot = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    v += amp * ref_vnoise(p);
    tot += amp;
    p = p * 2.03 + vec2(11.7, 7.3);
    amp *= gain;
  }
  return v / max(tot, 1e-4);
}


float ref_gabor(vec2 p, float freq, float dirs){
  float s = 0.0;
  for(int i = 0; i < 6; i++){
    if(float(i) >= dirs) break;
    float a = 3.14159265359 * float(i) / max(dirs, 1.0);
    vec2 d = vec2(cos(a), sin(a));
    s += (cos(dot(p, d) * freq + ref_hash1(vec2(float(i), 3.7)) * 6.28318530718) * 0.5 + 0.5);
  }
  return s / max(dirs, 1.0);
}


float ref_ridged(vec2 p, int oct, float gain){
  float v = 0.0, amp = 0.5, tot = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    float n = 1.0 - abs(ref_perlin(p) * 2.0 - 1.0);
    v += amp * n * n;
    tot += amp;
    p = p * 2.05 + vec2(2.3, 6.1);
    amp *= gain;
  }
  return clamp(v / max(tot, 1e-4), 0.0, 1.0);
}


float ref_turb(vec2 p, int oct){
  float v = 0.0, amp = 0.5, tot = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    v += amp * abs(ref_vnoise(p) * 2.0 - 1.0);
    tot += amp;
    p = p * 2.07 + vec2(5.2, 1.3);
    amp *= 0.5;
  }
  return v / max(tot, 1e-4);
}


vec3 ref_voro2(vec2 p, float j){
  vec2 n = floor(p), f = fract(p);
  float f1 = 8.0, f2 = 8.0;
  for(int y = -1; y <= 1; y++)
  for(int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 o = ref_hash2(n + g) * j;
    float d = length(g + o - f);
    if(d < f1){ f2 = f1; f1 = d; }
    else if(d < f2){ f2 = d; }
  }
  return vec3(f1, f2, 0.0);
}


vec2 ref_warp(vec2 p, float amp, float freq){
  vec2 q = vec2(ref_fbmP(p * freq, 3, 0.5), ref_fbmP(p * freq + vec2(5.2, 1.3), 3, 0.5)) * 2.0 - 1.0;
  return p + q * amp;
}

vec3 ref_vector_Curl(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    vec2 c = ref_curlN(uv * refP0, refP2);
    float m = length(c);
    vec2 d = c / max(m, 1e-5);
    float s = clamp(m * refP1, 0.0, 1.0);
    return vec3(mix(vec2(0.5), d * 0.5 + 0.5, s), 0.5);

}
vec3 ref_vector_FlowMap(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    vec2 dir = ref_curlN(uv * refP0, 0.02);
    float m = length(dir);
    vec2 d = dir / max(m, 1e-5);
    return vec3(d * 0.5 + 0.5, clamp(m * refP1, 0.0, 1.0));

}
vec3 ref_vector_TurbulenceMap(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    vec2 dir = vec2(0.0);
    vec2 q = uv * refP0;
    float amp = 1.0;
    for(int i = 0; i < 4; i++){
      if(float(i) >= floor(refP2)) break;
      dir += ref_curlN(q, 0.02) * amp;
      q *= 2.1;
      amp *= 0.55;
    }
    float m = length(dir);
    vec2 d = dir / max(m, 1e-5);
    return vec3(d * 0.5 + 0.5, clamp(m * refP1, 0.0, 1.0));

}
vec3 ref_vector_RadialFlow(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    vec2 dir = normalize(p + vec2(1e-5));
    dir *= mix(1.0, -1.0, refP1);
    float fade = clamp(1.0 - length(p) / max(refP2, 0.01), 0.0, 1.0);
    return vec3(dir * 0.5 * refP0 * fade + 0.5, fade);

}
vec3 ref_vector_VortexFlow(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    vec2 q = ref_rot2(p, refP2);
    vec2 dir = vec2(-q.y, q.x) / max(length(q), 1e-4);
    float fade = clamp(1.0 - length(p) / max(refP1, 0.01), 0.0, 1.0);
    return vec3(dir * 0.5 * refP0 * fade + 0.5, fade);

}
vec3 ref_vector_DirectionalFlow(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    vec2 base = vec2(cos(refP0), sin(refP0));
    float w = (ref_fbmP(uv * refP2, 4, 0.5) * 2.0 - 1.0) * refP1;
    float s = ref_fbmP(uv * refP2 + vec2(7.7, 3.1), 4, 0.5);
    vec2 dir = vec2(cos(refP0 + w), sin(refP0 + w));
    return vec3(dir * 0.5 + 0.5, clamp(s, 0.0, 1.0));

}
vec3 ref_vector_PolarFlow(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    float a = atan(p.y, p.x);
    float r = length(p);
    vec2 radial = vec2(cos(a), sin(a));
    vec2 tang = vec2(-sin(a), cos(a));
    vec2 dir = normalize(mix(radial, tang, refP0) + vec2(1e-5));
    float mod_ = clamp(0.5 + 0.5 * sin(r * refP1 * 6.0) * refP2, 0.0, 1.0);
    return vec3(dir * 0.5 * refP2 * 0.5 + 0.5, mod_);

}
vec3 ref_vector_VectorWarp(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    vec2 q = ref_warp(uv * refP0, refP1, 1.0);
    vec2 g = abs(fract(q * refP2 / max(refP0, 0.5)) - 0.5);
    float grid = 1.0 - ref_smoothstep(0.42, 0.5, max(g.x, g.y));
    vec2 dv = q - uv * refP0;
    vec2 dir = dv / max(length(dv), 1e-5);
    return vec3(dir * 0.5 * 0.5 + 0.5, grid);

}
vec3 ref_vector_Displacement(vec2 p,vec2 uv,vec4 refArgs0,vec4 refArgs1,float time){
float refP0=refArgs0.x;
float refP1=refArgs0.y;
float refP2=refArgs0.z;
float refP3=refArgs0.w;
float refP4=refArgs1.x;
float refP5=refArgs1.y;
float refP6=refArgs1.z;
float refP7=refArgs1.w;

    vec2 q = uv * refP0;
    float n1 = ref_fbmP(q, 4, 0.5) * 2.0 - 1.0;
    float n2 = ref_fbmP(q + vec2(7.7), 4, 0.5) * 2.0 - 1.0;
    float n3 = ref_fbmP(q + vec2(13.3), 4, 0.5) * 2.0 - 1.0;
    vec3 d = vec3(n1, n2, n3 * refP2);
    return clamp(d * 0.5 * refP1 + vec3(0.5), 0.0, 1.0);

}
