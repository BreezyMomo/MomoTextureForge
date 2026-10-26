
vec3 ehDiskEmission(vec3 pos,float elapsed,float seedValue,float innerEdge,float outerEdge,float heat,float filamentDetail){
 float radius=length(pos.xz),angle=atan(pos.z,pos.x);
 float normalizedR=(radius-innerEdge)/max(outerEdge-innerEdge,.01);
 // Differential rotation gives shearing filaments rather than a rotating decal.
 float orbit=elapsed*1.9/pow(max(radius,.5),1.5);
 vec3 flow=vec3(radius*4.8,cos(angle-orbit)*2.,sin(angle-orbit)*2.+seedValue*.07);
 float turbulence=ehFbm(flow);
 float phase=angle-orbit;
 vec3 thread=vec3(radius*22.+turbulence*3.,cos(phase)*9.,sin(phase)*9.+seedValue*.13);
 float filament=ehFbm(thread);
 float fine=pow(clamp(filament*1.6,0.,1.),3.);
 float hot=ehFbm(flow*3.8+5.);
 float ripples=.5+.5*sin(radius*85.+turbulence*25.+hot*9.);
 float brightness=(.17+fine*2.2+hot*.35+ripples*.11)*exp(-normalizedR*1.7);
 brightness*=smoothstep(0.,.07,normalizedR)*(1.-smoothstep(.70,1.,normalizedR));
 float doppler=pow(clamp(1.+pos.x/max(radius,.01)*.43,.3,1.6),1.65);
 float temperature=clamp(.94-normalizedR*.88+(turbulence-.5)*.8+heat,0.,1.1);
 vec3 plasma=mix(vec3(1.,.055,.008),vec3(1.,.40,.055),smoothstep(0.,.60,temperature));
 plasma=mix(plasma,vec3(1.,.88,.55),smoothstep(.42,1.,temperature));
 plasma=mix(plasma,vec3(1.,.95,.83),smoothstep(.93,1.1,temperature));
 return plasma*brightness*doppler*filamentDetail;
}

vec4 generate(vec2 uv){
 vec2 p=ehRotate((uv-vec2(centerX,centerY))*2./magnification,-diskTilt*.01745329252);
 float inclination=viewAngle*.01745329252;
 vec3 origin=vec3(0.,sin(inclination),cos(inclination))*8.5;
 vec3 forward=normalize(-origin),right=vec3(1,0,0),up=normalize(cross(right,forward));
 float focal=1.7;
 vec3 velocity=normalize(forward*focal+right*p.x+up*p.y);
 vec3 position=origin;
 float horizon=.66;
 float innerEdge=horizon*diskInner,outerEdge=4.65;
 float angularMomentum=length(cross(origin,velocity));
 float conserved=angularMomentum*angularMomentum;
 vec3 emission=vec3(0.);float transmittance=1.;
 float minimumRadius=100.,lastY=position.y;
 float elapsed=time*motionSpeed;
 bool captured=false;
 for(int i=0;i<150;i++){
  float radius=length(position);
  minimumRadius=min(minimumRadius,radius);
  if(radius<horizon*1.015){captured=true;break;}
  if(radius>16. && i>12)break;
  float stepLength=clamp(radius*.072,.035,.38);
  // Schwarzschild-inspired null-ray acceleration, spatial step in horizon units.
  vec3 acceleration=-1.5*horizon*conserved*position/pow(max(radius,.3),5.);
  vec3 nextPosition=position+velocity*stepLength+acceleration*(stepLength*stepLength*.5);
  vec3 nextVelocity=velocity+acceleration*stepLength;
  if(position.y*nextPosition.y<0.){
   float crossing=position.y/(position.y-nextPosition.y);
   vec3 diskPoint=mix(position,nextPosition,crossing);
   float diskRadius=length(diskPoint.xz);
   if(diskRadius>innerEdge && diskRadius<outerEdge){
    vec3 disk=ehDiskEmission(diskPoint,elapsed,seed,innerEdge,outerEdge,diskHeat,filamentStrength);
    float occupancy=smoothstep(innerEdge,innerEdge+.13,diskRadius)*(1.-smoothstep(outerEdge-.7,outerEdge,diskRadius));
    emission+=transmittance*disk*diskBrightness;
    transmittance*=1.-occupancy*.92;
   }
  }
  // A finite-thickness hot atmosphere softens only the disk, not the whole image.
  float radial=length(position.xz);
  float envelope=exp(-abs(position.y)/.12)*smoothstep(innerEdge,innerEdge+.4,radial)*(1.-smoothstep(outerEdge*.7,outerEdge,radial));
  emission+=transmittance*vec3(1.,.16,.025)*envelope*stepLength*.17*diskBrightness;
  position=nextPosition;velocity=nextVelocity;
 }

 // Factor the original E + B*T into straight RGBA so native source-over
 // preserves both shadowing and emissive plasma: A=1-T; RGB=E/A.
 if(captured)transmittance=0.;
 emission=max(emission,vec3(0.))*exposure;
 float peak=max(emission.r,max(emission.g,emission.b));
 vec3 radiance=pow(emission/(1.+peak),vec3(.85));
 transmittance*=smoothstep(2.5980762*horizon,4.5*horizon,angularMomentum);
 float critical=2.5980762*horizon;
 float photon=exp(-abs(angularMomentum-critical)/.014)*.22;
 radiance+=vec3(1.,.32,.055)*photon*diskBrightness*.25;
 // A tiny floor represents emission in otherwise fully transparent space.
 // Native compositing supports RGB above 1 (verified); do not clamp RGB here.
 float coverage=max(1.-transmittance,.0001);
 return vec4(radiance/coverage,coverage);
}