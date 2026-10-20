float filmNoise(vec2 uv,float z,int octaves,float rough){float amplitude=.5,total=0.,value=0.,gain=exp2(-mix(1.2,.3,rough));for(int i=0;i<8;i++){if(i>=octaves)break;float n=snoise(vec3(uv,z+float(i)*31.7));value+=mix(n,abs(n)*2.-1.,rough*.4)*amplitude;total+=amplitude;uv=rot(uv,.64)*2.02;amplitude*=gain;}return value/max(total,.001);}
vec4 generate(vec2 uv){
 float z=seed*.137+3.7+time*motionSpeed*7.,frequency=80./max(size,.05);int octaves=2+int(roughness*5.);
 float mono=filmNoise(uv*frequency,z,octaves,roughness)*.5+.5;
 if(filmLook>.5){float distance=gWorley(uv*frequency/max(clumpSize,.3),z);float mask=smoothstep(0.,.6,distance);mask*=.75+.25*snoise(vec3(uv*frequency/max(clumpSize,.3)*.7,z+100.));mono=mix(mono,mono*(.3+mask*1.4),.7);}
 mono=clamp((mono-.5)*contrast+.5+brightness,0.,1.);
 vec3 color=vec3(mono);
 if(monochrome<.5){vec3 chroma=vec3(filmNoise(uv*frequency,z+19.,octaves,roughness),filmNoise(uv*frequency,z+47.,octaves,roughness),filmNoise(uv*frequency,z+79.,octaves,roughness))*.5+.5;color=mix(color,chroma,colorShift);}
 float spots=0.;for(int layer=0;layer<2;layer++){vec2 p=uv*(45.+float(layer)*31.),cell=floor(p),delta=fract(p)-vec2(hash21(cell+seed+float(layer)*19.),hash21(cell+seed+71.+float(layer)*19.));float present=step(1.-dustAmount*.1,hash21(cell+seed+131.));float radius=max(.015,dustSize*.2);spots+=exp(-dot(delta,delta)/max(radius*radius*(.2+dustBlur),.00001))*present;}
 float damage=0.;for(int i=0;i<32;i++){if(float(i)>=scratches*32.)break;float id=float(i);float x=hash21(vec2(id,seed+13.));float centerY=hash21(vec2(id+29.,seed));float halfLength=mix(.03,.8,scratchLength)*(.3+.7*hash21(vec2(id+71.,seed)));float wobble=gSigned(vec2(uv.y*20.+id,z))*.001*scratchVariety;float lineWidth=mix(.0003,.0018,hash21(vec2(id+91.,seed)));float lineValue=exp(-abs(uv.x-x+wobble)/lineWidth)*(1.-smoothstep(halfLength*.8,halfLength,abs(uv.y-centerY)));if(scratchStyle>.5)lineValue*=smoothstep(-.3,.3,gSigned(vec2(uv.y*40.,id+z)));damage=max(damage,lineValue);}
 float vignetteMask=1.-smoothstep(.15,1.,length(uv-.5)*1.414)*vignette;
 color=clamp(max(color,vec3(max(spots,damage)))*max(0.,vignetteMask),0.,1.);float alpha=clamp(max(max(color.r,color.g),color.b)*amount,0.,1.);return vec4(color,alpha);
}
