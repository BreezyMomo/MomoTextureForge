// Shared deterministic value noise for animated generators.
float motionHash(vec3 p){p=fract(p*.1031+generatorSeed*.001);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float motionNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(motionHash(i),motionHash(i+vec3(1,0,0)),f.x),mix(motionHash(i+vec3(0,1,0)),motionHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(motionHash(i+vec3(0,0,1)),motionHash(i+vec3(1,0,1)),f.x),mix(motionHash(i+vec3(0,1,1)),motionHash(i+vec3(1)),f.x),f.y),f.z);}
float motionFbm(vec3 p){float sum=0.,a=.5;for(int i=0;i<5;i++){sum+=a*motionNoise(p);p=p*2.03+vec3(7.1,3.7,5.2);a*=.5;}return sum;}
