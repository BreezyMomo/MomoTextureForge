// Single editable motif. Repetition belongs to the general arrangement stage.
vec2 z=abs((u-.5)/vec2(R,N));
float soft=max(S,.45*length(fwidth(u)));
vec2 target=z/H;
float edge=1.;
for(int curve=0;curve<2;curve++){
  vec2 a0=curve==0?vec2(0.,.385):vec2(.202,.20);
  vec2 a1=curve==0?vec2(.09,.385):vec2(.17,.11);
  vec2 a2=curve==0?vec2(.025,.245):vec2(.32,.15);
  vec2 a3=curve==0?vec2(.202,.20):vec2(.32,0.);
  // Curvature changes handles without moving the measured endpoints.
  float bend=D/.065;
  a1=mix(mix(a0,a3,1./3.),a1,bend);
  a2=mix(mix(a0,a3,2./3.),a2,bend);
  vec2 previous=a0;
  for(int n=1;n<=12;n++){
    float t=float(n)/12., s=1.-t;
    vec2 next=s*s*s*a0+3.*s*s*t*a1+3.*s*t*t*a2+t*t*t*a3;
    vec2 segment=next-previous, delta=target-previous;
    float at=clamp(dot(delta,segment)/max(dot(segment,segment),.000001),0.,1.);
    edge=min(edge,length(delta-segment*at));
    previous=next;
  }
}
float border=fill(edge*H-W,soft);
// Connected diagonal petals (an X), not four oval lobes.
vec2 flowerPoint=z/max(K,.001);
float flowerDistance=max(abs(flowerPoint.x-flowerPoint.y)-(.20+.15*(flowerPoint.x+flowerPoint.y)),max(flowerPoint.x,flowerPoint.y)-1.);
float flower=fill(flowerDistance*K,soft);
float dotDistance=min(length(z-vec2(.20,0.)),length(z-vec2(0.,.20)));
float dots=b.w>0.?fill(dotDistance-b.w,soft):0.;
return sat(max(border,max(flower,dots)));
