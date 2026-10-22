// Authored for Momo Texture Forge. U follows the length, S crosses the sheet.
float ribbonHash(float n){return fract(sin(n*127.1+generatorSeed*17.17)*43758.5453);}
float ribbonFrequency(float n){return seamlessU>.5?max(1.,floor(n+.5)):n;}
// Value and analytic U derivative avoid resampling the whole path for normals.
vec2 ribbonWave(float u,float frequency,float phase){float f=ribbonFrequency(frequency),a=6.28318530718*(u*f+phase);return vec2(sin(a),6.28318530718*f*cos(a));}
vec2 ribbonCurve(float u,float s,float layer){
 float clock=time*motionSpeed,offset=noiseOffset+clock*.07,phase=ribbonHash(layer+17.);
 float x=u+offset;vec2 angle=6.28318530718*foldAmount*ribbonWave(x,waveCount,phase+clock*.025);
 vec2 center=waveAmplitude*ribbonWave(x,waveCount,phase+clock*.02);center.x+=.5;
 vec2 broad=ribbonWave(x,noiseFrequency,phase+s*.11+clock*.031);
 vec2 fine=ribbonWave(x,noiseFrequency*2.,phase*3.7+s*.7-clock*.043);
 center+=noiseStrength*(broad*.7+fine*.3);
 vec2 projected=vec2(s*cos(angle.x)+foldAmount*.32*sin(3.14159265359*s+angle.x),(-s*sin(angle.x)+foldAmount*.32*cos(3.14159265359*s+angle.x))*angle.y);
 vec2 micro=detailStrength*ribbonWave(x,noiseFrequency*4.,s*2.1+phase-clock*.06);
 return center+bandWidth*.5*projected+micro*(.3+.7*abs(s));
}
