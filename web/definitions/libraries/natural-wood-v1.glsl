float nwHash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float nwBand(float phase, float width, float feather) {
  float dist = abs(fract(phase + 0.5) - 0.5);
  float aa = max(fwidth(phase) * 0.65, 0.0001);
  return 1.0 - smoothstep(width, width + feather + aa, dist);
}
float nwSmoothMin(float x, float y, float k) {
 float nearest = min(x,y);
 return nearest-k*log(1.0+exp(-abs(x-y)/k));
}
float nwGrowthBand(float phase, float width, float feather, float baseRate) {
 float slope = length(vec2(dFdx(phase),dFdy(phase)));
 float scale = clamp(slope/max(baseRate,0.00001),0.12,2.0);
 float dist = abs(fract(phase+0.5)-0.5);
 return 1.0-smoothstep(width*scale,width*scale+feather*scale+max(slope*0.7,0.0001),dist);
}
