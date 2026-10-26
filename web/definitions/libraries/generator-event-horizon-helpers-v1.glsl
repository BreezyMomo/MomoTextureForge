
float ehHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float ehNoise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(ehHash(i),ehHash(i+vec3(1,0,0)),f.x),mix(ehHash(i+vec3(0,1,0)),ehHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ehHash(i+vec3(0,0,1)),ehHash(i+vec3(1,0,1)),f.x),mix(ehHash(i+vec3(0,1,1)),ehHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float ehFbm(vec3 p){float v=0.,w=.5;for(int i=0;i<6;i++){v+=w*ehNoise(p);p=vec3(-.80*p.y-.60*p.z,.80*p.x+.36*p.y-.48*p.z,.60*p.x-.48*p.y+.64*p.z)*2.03+vec3(7.3,1.7,4.8);w*=.5;}return v;}
vec2 ehRotate(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
vec3 ehColor(float packed){return vec3(floor(packed/65536.),mod(floor(packed/256.),256.),mod(packed,256.))/255.;}
