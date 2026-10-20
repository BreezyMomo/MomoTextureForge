// Generator noise is assembled from the host math library and MIT simplex noise.
float gSigned(vec2 p){return perlin(p+vec2(generatorSeed*.137+3.7,generatorSeed*.293+1.4));}
float gFbm(vec2 p,int count){float sum=0.,amplitude=.5;mat2 turn=mat2(.8,.6,-.6,.8);for(int octave=0;octave<8;octave++){if(octave>=count)break;sum+=amplitude*gSigned(p);p=turn*p*2.+100.;amplitude*=.5;}return sum;}
float gTurb(vec2 p,int count){float sum=0.,amplitude=.5;for(int octave=0;octave<8;octave++){if(octave>=count)break;sum+=amplitude*abs(gSigned(p));p=rot(p,.64)*2.+71.;amplitude*=.5;}return sum;}
float gRidged(vec2 p,int count){float value=0.,weight=.5;for(int i=0;i<8;i++){if(i>=count)break;float ridge=1.-abs(gSigned(p));value+=ridge*ridge*weight;p=rot(p,.64)*2.+100.;weight*=.5;}return value;}
vec2 gWarp(vec2 p,int count){vec2 first=vec2(gFbm(p,count),gFbm(p+vec2(5.2,1.3),count));return vec2(gFbm(p+first*2.+vec2(1.7,9.2),count),gFbm(p+first*2.+vec2(8.3,2.8),count));}
vec3 gColor(float packed){return vec3(floor(packed/65536.),mod(floor(packed/256.),256.),mod(packed,256.))/255.;}
float gWorley(vec2 p,float offset){vec2 cell=floor(p),f=fract(p);float nearest=4.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 d=vec2(x,y),key=cell+d+offset;vec2 jitter=vec2(hash21(key),hash21(key+71.));nearest=min(nearest,length(d+jitter-f));}return nearest;}
