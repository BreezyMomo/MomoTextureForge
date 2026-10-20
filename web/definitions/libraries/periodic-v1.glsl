
float periodicValue(vec2 p,vec2 period,float seed){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash21(mod(i,period)+seed),hash21(mod(i+vec2(1,0),period)+seed),f.x),mix(hash21(mod(i+vec2(0,1),period)+seed),hash21(mod(i+1.,period)+seed),f.x),f.y);}
float periodicPerlin(vec2 p,vec2 period,float seed){vec2 i=floor(p),f=fract(p),w=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(grad(mod(i,period)+seed),f),dot(grad(mod(i+vec2(1,0),period)+seed),f-vec2(1,0)),w.x),mix(dot(grad(mod(i+vec2(0,1),period)+seed),f-vec2(0,1)),dot(grad(mod(i+1.,period)+seed),f-1.),w.x),w.y)*1.7;}
float periodicFractal(vec2 u,float count,int octaves,float gain,float seed,float t){vec2 period=vec2(count),p=u*period+t;float value=0.,weight=1.,total=0.;for(int i=0;i<8;i++){if(i>=octaves)break;value+=weight*periodicValue(p,period,seed);total+=weight;weight*=gain;p=p*2.+13.7;period*=2.;}return value/max(total,.00001);}
float periodicTurb(vec2 u,float count,float seed,float t){vec2 period=vec2(count),p=u*period+t;float value=0.,weight=.5;for(int i=0;i<5;i++){value+=weight*abs(periodicPerlin(p,period,seed));p=p*2.+11.;period*=2.;weight*=.5;}return sat(value*1.5);}
vec3 periodicVoronoi(vec2 p,vec2 period,float seed){vec2 i=floor(p),f=fract(p);float a=10.,b=10.,id=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y),cell=mod(i+o,period),h=vec2(hash21(cell+seed),hash21(cell+seed+9.));float d=length(o+h-f);if(d<a){b=a;a=d;id=hash21(cell+seed);}else b=min(b,d);}return vec3(a,b-a,id);}

// Wrap only seed identities, never local distances: neighboring tiles share cells.
vec3 periodicCells(vec2 p,float count,float jitter){
 vec2 cell=floor(p),f=fract(p);float first=1e5,second=1e5,id=0.;
 for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){
  vec2 o=vec2(x,y),wrapped=mod(cell+o,vec2(count));
  vec2 point=.5+(vec2(hash21(wrapped),hash21(wrapped+9.))-.5)*jitter;
  float dist=length(o+point-f);
  if(dist<first){second=first;first=dist;id=hash21(wrapped+3.71);}else second=min(second,dist);
 }
 return vec3(first,second,id);
}
float periodicGradientFractal(vec2 u,float count,int octaves,float gain,bool turbulent){
 vec2 period=vec2(count),p=u*period;float v=0.,weight=1.,total=0.;
 for(int i=0;i<8;i++){if(i>=octaves)break;float n=periodicPerlin(p,period,0.);v+=weight*(turbulent?abs(n):n*.5+.5);total+=weight;weight*=gain;p=p*2.+13.7;period*=2.;}
 return sat(v/max(total,.00001));
}
