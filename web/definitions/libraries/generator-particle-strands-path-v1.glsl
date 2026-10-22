// Independent strands have seeded phase, frequency and amplitude variation.
float ribbonHash(float n){return fract(sin(n*127.1+generatorSeed*17.17)*43758.5453);}
float ribbonFrequency(float n){return seamlessU>.5?max(1.,floor(n+.5)):n;}
vec2 ribbonWave(float u,float frequency,float phase){float f=ribbonFrequency(frequency),a=6.28318530718*(u*f+phase);return vec2(sin(a),6.28318530718*f*cos(a));}
vec2 ribbonCurve(float u,float s,float layer){
 float index=floor((s+1.)*.5*strandCount)+layer*1093.,phase=ribbonHash(index+11.),clock=time*motionSpeed;
 float x=u+noiseOffset+clock*.07,spread=.5+.5*ribbonHash(index+19.);
 vec2 center=waveAmplitude*ribbonWave(x,waveCount,layer*.23+clock*.03);center.x+=.5+bandWidth*.5*s;
 vec2 independent=ribbonWave(x,noiseFrequency*(.65+.7*ribbonHash(index+43.)),phase+clock*(.025+.03*phase));
 vec2 fine=ribbonWave(x,noiseFrequency*3.,phase*3.7-clock*.06);
 return center+noiseStrength*spread*independent+detailStrength*fine;
}
