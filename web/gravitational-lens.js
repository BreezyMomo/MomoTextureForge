// Static UV deflection over arbitrary premultiplied color and height inputs.
// Centers use normalized canvas coordinates; size is relative to the short edge.
export const GRAVITATIONAL_LENS_GLSL=`
vec2 lensRotate(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
vec2 lensUV(vec2 uv){
 float magnification=fxData[0].y,lensingStrength=fxData[0].x;
 vec2 center=fxData[0].zw;
 vec2 p=lensRotate((uv-center)*fxMetric*2./magnification,-(3.0)*.01745329252);
 float inclination=(27.0)*.01745329252;
 vec3 origin=vec3(0.,sin(inclination),cos(inclination))*8.5;
 vec3 forward=normalize(-origin),right=vec3(1,0,0),up=normalize(cross(right,forward));
 float focal=1.7;
 vec3 velocity=normalize(forward*focal+right*p.x+up*p.y);
 vec3 position=origin;
 float horizon=.66;

 float angularMomentum=length(cross(origin,velocity));
 float conserved=angularMomentum*angularMomentum;




 for(int i=0;i<150;i++){
  float radius=length(position);

  if(radius<horizon*1.015){break;}
  if(radius>16. && i>12)break;
  float stepLength=clamp(radius*.072,.035,.38);
  // Schwarzschild-inspired null-ray acceleration, spatial step in horizon units.
  vec3 acceleration=-1.5*horizon*conserved*position/pow(max(radius,.3),5.);
  vec3 nextPosition=position+velocity*stepLength+acceleration*(stepLength*stepLength*.5);
  vec3 nextVelocity=velocity+acceleration*stepLength;
  position=nextPosition;velocity=nextVelocity;
 }

 // This layer generates only the deflected nebula. No shadow or disk is baked in.
 vec3 outDirection=normalize(velocity);
 float facing=dot(outDirection,forward);
 vec2 warped=vec2(dot(outDirection,right),dot(outDirection,up))/max(abs(facing),.2)*focal;
 warped=lensRotate(warped,(3.0)*.01745329252)*magnification*.5/fxMetric+center;
 float lensEnvelope=exp(-length(p)*length(p)*1.6);
 vec2 skyUV=mix(uv,clamp(warped,.001,.999),lensingStrength*lensEnvelope);
 return skyUV;
}
`;
