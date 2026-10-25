
float shash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float snoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(shash(i),shash(i+vec2(1,0)),f.x),mix(shash(i+vec2(0,1)),shash(i+1.),f.x),f.y);}
float sfbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*snoise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+3.7;a*=.5;}return n;}
mat2 srot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float sline(float d,float w){return exp(-abs(d)/w);}
vec3 cold(float x){return mix(vec3(.11,.32,1.),vec3(.28,1.,1.),clamp(x,0.,1.));}
vec3 hot(float x){return mix(vec3(1.,.13,.045),vec3(1.,.85,.43),clamp(x,0.,1.));}
float angled(float a,float b){return atan(sin(a-b),cos(a-b));}
vec3 starfield(vec2 p,float phase,float sd){vec3 c=vec3(0);for(int k=0;k<3;k++){float sc=18.+float(k)*19.;vec2 q=p*sc,cell=floor(q),v=fract(q)-.5;float h=shash(cell+sd+float(k)*31.);vec2 off=vec2(shash(cell+4.1),shash(cell+7.4))*.6-.3;float d=length(v-off);float pulse=.6+.4*sin(phase+6.283*h);float st=exp(-d*d/(.0006+.0008*h))*step(.84,h);c+=mix(vec3(.3,.5,1.),vec3(1.,.74,.55),h)*st*pulse*(.25+float(k)*.15);}return c;}
vec3 spaceLayer(vec2 p,float ph,float sd){float r=length(p);vec2 q=srot(.45)*p;float n=sfbm(q*3.+vec2(cos(ph),sin(ph))*.10+sd);float mist=pow(n,3.)*exp(-abs(q.y+.18*sin(q.x*3.))*3.);vec3 c=vec3(.004,.008,.022)+vec3(.13,.045,.28)*mist; c+=vec3(.0,.12,.19)*pow(sfbm(p*4.+7.+sd),4.)*exp(-r);return c+starfield(p,ph,sd);}
vec3 diskLayer(vec2 p,float ph,float sd,float amt){
 vec2 q=srot(.26)*p; q.y*=2.8; float r=length(q),a=atan(q.y,q.x);vec3 c=vec3(0);
 float region=smoothstep(.18,.27,r)*(1.-smoothstep(.67,.88,r));
 float turbulence=sfbm(vec2(cos(a)*3.,sin(a)*3.)+vec2(r*11.,0.)+vec2(cos(ph),sin(ph))*.55+sd);
 float spiral=pow(.5+.5*sin(a*5.+r*32.-ph*2.+turbulence*5.),7.);
 c+=mix(vec3(.22,.055,.7),vec3(.08,.75,1.),.5+.5*sin(a+r*8.))*spiral*region*.85;
 c+=vec3(.09,.18,.42)*pow(turbulence,2.)*region*.3;
 for(int i=0;i<9;i++){float f=float(i);float rad=.235+f*.061;float wave=.009*sin(a*7.+ph*2.+f)+.004*sin(a*19.-ph*3.);float d=r-rad-wave;float flow=pow(.5+.5*sin(a*(3.+mod(f,3.))-ph*(1.+mod(f,2.))+f*2.1),3.);float arc=.12+.88*flow;float gl=sline(d,.0025)*1.5+sline(d,.014)*.28+sline(d,.05)*.045;c+=mix(cold(.65),vec3(.7,.15,1.),f/9.)*gl*arc;}
 // Near-side occlusion gives the central star physical depth.
 c*=mix(1.,smoothstep(.12,.24,length(p)),step(0.,q.y));
 vec2 jet=srot(.26)*p;float beams=exp(-abs(jet.x)/(.007+.022*abs(jet.y)))*exp(-abs(jet.y)*4.)*smoothstep(.08,.24,abs(jet.y));
 c+=vec3(.10,.5,1.)*beams*(.5+.3*sin(ph*2.));
 return c*amt;
}
vec3 coreLayer(vec2 p,float ph,float sd,float strength){
 float r=length(p),a=atan(p.y,p.x);float pulse=1.+.035*sin(ph*2.);float rad=.132*pulse;
 vec2 sphere=p/max(rad,.001);float z=sqrt(max(0.,1.-dot(sphere,sphere)));float inside=1.-smoothstep(rad-.002,rad+.002,r);
 float lava=sfbm(sphere*4.+vec2(cos(ph),sin(ph))*1.2+sd);float veins=pow(1.-abs(sin(lava*18.+z*4.+ph*2.)),6.);
 vec3 c=hot(.7)*(.4+.7*z+veins*1.5)*inside;
 c+=vec3(1.,.86,.62)*exp(-r*r/.003)*1.4;
 float corona=abs(r-rad-.009*sin(a*9.+ph*2.)-.005*sin(a*23.-ph*3.));
 c+=hot(.8)*(sline(corona,.0025)*2.+sline(corona,.016)*.7+sline(corona,.07)*.13);
 float ray=pow(.5+.5*sin(a*19.+snoise(vec2(cos(a)*4.+cos(ph),sin(a)*4.+sin(ph)))*4.),15.);
 c+=hot(.35)*ray*exp(-max(0.,r-rad)*11.)*smoothstep(rad,rad+.02,r)*.32;
 float flare=exp(-abs(p.y+.018*sin(p.x*8.+ph))/.003)*exp(-abs(p.x)*5.5);
 c+=vec3(.7,.9,1.)*flare*.75;
 c+=vec3(.55,.1,.65)*exp(-r*r/.065)*.12;
 return c*strength;
}
vec3 fieldLayer(vec2 p,float ph,float sd,float amount){
 float r=length(p),a=atan(p.y,p.x);vec3 c=vec3(0);
 for(int i=0;i<3;i++){float f=float(i);float rr=.36+f*.115;float wob=.014*sin(a*(7.+f*2.)+ph*2.+f)+.007*sin(a*31.-ph*3.+f);float d=r-rr-wob;float gate=smoothstep(.10,.8,.5+.5*sin(a*3.-ph*(1.+f)+f*3.));c+=mix(cold(1.),vec3(.75,.12,1.),f*.45)*(sline(d,.0016)*1.5+sline(d,.009)*.27+sline(d,.03)*.065)*gate;}
 // Two inclined orbital planes, counter-rotating light packets.
 for(int i=0;i<2;i++){float f=float(i);vec2 q=srot(-.8+f*1.65)*p; q.y*=1.6;float rr=length(q),aa=atan(q.y,q.x);float mask=.2+.8*pow(.5+.5*cos(aa*2.+ph*(1.+f)*2.),8.);c+=mix(vec3(.14,.8,1.),vec3(.8,.16,1.),f)*(sline(rr-.69,.0018)+sline(rr-.69,.014)*.12)*mask;}
 float ticks=pow(max(0.,cos(a*96.-ph*2.)),24.);c+=vec3(.14,.5,.75)*ticks*sline(r-.79,.008)*.45;
 float fine=(sline(r-.758,.001)+sline(r-.815,.001))*.10;c+=vec3(.15,.45,.65)*fine;
 // Outward-moving plasma seeds, addressed in polar cells.
 float ai=(a+3.14159265)/6.2831853*72.;float cell=floor(ai);
 for(int j=-1;j<=1;j++){float idx=mod(cell+float(j)+72.,72.);float h=shash(vec2(idx,sd+13.));float pa=(idx+.2+h*.6)/72.*6.2831853-3.14159265;float age=fract(ph/6.2831853+h);float pr=.2+age*.67;float da=angled(a,pa+sin(ph)*.018);float d=length(vec2((r-pr)*.6,da*max(r,.1)));float fade=sin(age*3.14159265);vec3 col=mix(cold(1.),hot(.6),step(.78,h));c+=col*(sline(d,.0018)*2.+sline(d,.009)*.22)*fade;float trail=exp(-abs(da)*r/.0015)*exp(-abs(r-pr+.022)/.022)*.1;c+=col*trail*fade;}
 float wave=fract(ph/6.2831853);float wr=.18+.72*wave;float shock=sline(r-wr,.002)*pow(sin(wave*3.14159265),2.);c+=vec3(.22,.65,1.)*shock*.22;
 return c*amount;
}
