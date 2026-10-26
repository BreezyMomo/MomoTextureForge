
vec4 generate(vec2 uv){
 vec2 p=(uv-.5)*2.;
 float drift=time*motionSpeed*.025;
 vec3 z=vec3(p*2.3,seed*.127+drift);
 vec2 warp=vec2(ehFbm(z+7.1),ehFbm(z+19.4));
 float broad=ehFbm(z+vec3(warp*2.3,0.));
 float filaments=ehFbm(z*3.4+vec3(warp*2.,0.));
 float detail=ehFbm(z*10.+vec3(warp*4.,0.));
 // Diagonal dust lanes and illuminated turbulent cloud fronts.
 float lane=p.y+.32*p.x+.18*sin(p.x*2.3)+.23*(broad-.5);
 float cloudShape=exp(-pow((abs(lane)-.66)/.46,2.));
 float clouds=pow(smoothstep(.24,.78,broad),1.6)*cloudShape;
 float edge=pow(clamp(1.-abs(filaments-.49)*4.2,0.,1.),7.);
 float illumination=max(0.,broad-ehFbm(z+vec3(warp*2.3,0.)+vec3(-.16,.25,.06)))*8.;
 float lum=clouds*(.23+illumination*1.7+filaments*.85+edge*.2+detail*.3)*nebulaDensity;
 float palette=smoothstep(-.65,.65,p.x+.2*p.y+(broad-.5)*2.5);
 vec3 neb=mix(ehColor(coldColor),ehColor(hotColor),palette);
 neb=mix(neb,vec3(.25,.055,.65),.22*(1.-cloudShape));
 vec3 col=neb*lum;
 // Dust absorbs background light instead of adding a uniform luminous fog.
 float dust=pow(ehFbm(z*3.+vec3(warp,0.)*3.5),3.);
 col*=exp(-dust*5.);
 col+=neb*pow(edge,2.)*clouds*.08;
 // Three reproducible stellar scales, sparse bright stars with diffraction.
 for(int layer=0;layer<3;layer++){
  float scale=70.+float(layer)*63.;
  vec2 cell=floor(uv*scale),f=fract(uv*scale)-.5;
  float h=ehHash(vec3(cell,seed+float(layer)*23.));
  vec2 offset=vec2(ehHash(vec3(cell,12.+seed)),ehHash(vec3(cell,41.+seed)))*.7-.35;
  vec2 d=f-offset;float rr=dot(d,d);
  float starWeight=step(.965-float(layer)*.006,h)*starDensity;
  float twinkle=.75+.25*sin(time*motionSpeed*.55+h*340.);
  float point=exp(-rr*(520.+float(layer)*260.));
  float flare=exp(-abs(d.x)*100.)*exp(-abs(d.y)*13.)+exp(-abs(d.y)*100.)*exp(-abs(d.x)*13.);
  vec3 st=mix(vec3(.48,.73,1.),vec3(1.,.75,.53),ehHash(vec3(cell,9.)));
  col+=st*(point+flare*.32*step(.989,h))*starWeight*twinkle*(1.4+float(layer)*.3);
 }
 col=1.-exp(-max(col,vec3(0.))*1.9);
 vec3 radiance=pow(col,vec3(.83));
 float coverage=max(radiance.r,max(radiance.g,radiance.b));
 return coverage>.000001?vec4(radiance/coverage,coverage):vec4(0.);
}