{
float grainCount = a.x;
float grainWidth = a.y;
float bendAmount = a.z;
float bendScale = a.w;
float irregularity = b.x;
float knotDensity = b.y;
float knotStrength = b.z;
float knotSize = b.w;
float strokeVariation = c.x;
float edgeSoftness = c.y;
float grainContrast = c.z;
float directionDeg = c.w;
float randomSeed = d.x;
float ringLayers = d.y;
float knotAspect = d.z;
float knotScatter = d.w;
{
vec2 p = rot(u - 0.5, directionDeg * PI / 180.0) + 0.5;
vec2 off = vec2(randomSeed * 3.17 + 11.0, randomSeed * 1.73 + 29.0);
float count = floor(grainCount + 0.5);
float warp = (noise(vec2(p.y * bendScale * 2.0, 3.2) + off) - 0.5) * 0.16;
warp += sin(p.y * bendScale * TAU + randomSeed) * 0.025;
p.x += warp * bendAmount;
vec2 s = p * knotDensity;
vec2 cellSize = vec2(0.75, 1.10);
vec2 cell = floor(s / cellSize);
float growth = 100.0;
float tipWeight = 0.0;
float totalWeight = 0.0;
// Each knot is a minimum of one continuous growth field, not a displacement hill.
// Parabolic length with a narrow axial crease creates long, tapered inner rings.
for (int row = -2; row <= 2; row++) {
 for (int col = -2; col <= 2; col++) {
  vec2 id = cell + vec2(float(col),float(row));
  float seed = dot(id,vec2(17.0,97.0)) + randomSeed * 7.0;
  vec2 jitter = vec2(nwHash(seed+3.0),nwHash(seed+31.0))-0.5;
  vec2 center = (id+0.5+jitter*knotScatter*0.55)*cellSize;
  center.y += mod(id.x,2.0) * cellSize.y * 0.47;
  vec2 delta = (s-center)/knotDensity;
  delta.x += (nwHash(seed+47.0)-0.5)*0.07*delta.y;
  delta.x += sin(delta.y*2.5+seed)*0.006*irregularity;
  delta.x += delta.y*delta.y*(nwHash(seed+59.0)-0.5)*0.08;
  float axial = sqrt(delta.x*delta.x+0.000004);
  float longitudinal = delta.y / knotAspect;
  float taper = 1.0 + 0.25*tanh(delta.y*2.0);
  float metric = axial + longitudinal*longitudinal*taper / max(knotSize,0.01);
  float blendScale = 0.08/max(knotDensity,1.0);
  float nextGrowth = nwSmoothMin(growth,metric,blendScale);
  // Stable soft-nearest weights also blend tip taper continuously across joins.
  float keepWeight = exp(-(growth-nextGrowth)/blendScale);
  float addWeight = exp(-(metric-nextGrowth)/blendScale);
  float axisTaper = smoothstep(0.001,0.026,abs(delta.x));
  axisTaper = mix(1.0,axisTaper,smoothstep(0.02,0.10,abs(delta.y)));
  tipWeight = tipWeight*keepWeight + axisTaper*addWeight;
  totalWeight = totalWeight*keepWeight + addWeight;
  growth = nextGrowth;
 }
}
growth = max(growth,0.0);
float grainField = mix(p.x, growth, knotStrength);
float phase = grainField*count;
phase += knotStrength*ringLayers*(1.0-exp(-growth/max(knotSize,0.01)));
phase += (noise(vec2(p.x*5.0,p.y*0.7)+off+70.0)-0.5)*irregularity*0.55;
// Monotone phase remapping changes spacing without creating folded extra rings.
float rhythm = phase;
phase += irregularity*(0.70*sin(rhythm*0.61+randomSeed) + 0.18*sin(rhythm*1.77+randomSeed*2.3));
// Each growth line has its own thickness, with gradual variation along its length.
float bandIndex = floor(phase+0.5);
float bandWidth = 0.25+1.65*pow(nwHash(bandIndex+randomSeed*13.0+7.0),0.7);
float along = noise(vec2(bandIndex*4.7+off.x,p.y*4.5+off.y));
float alongWidth = mix(0.32,1.65,smoothstep(0.15,0.85,along));
float widthVariation = mix(1.0,bandWidth*alongWidth,strokeVariation);
float tipTaper = mix(1.0,mix(0.10,1.0,tipWeight/max(totalWeight,0.0001)),knotStrength);
widthVariation *= tipTaper;
float baseRate = count*length(vec2(dFdx(p.x),dFdy(p.y)))*0.7071;
float broad = nwGrowthBand(phase,grainWidth*widthVariation,edgeSoftness,baseRate);

float variation = 0.85+noise(vec2(p.x*24.0,p.y*1.8)+off)*0.15;
return sat(broad*variation*grainContrast);
}
}
