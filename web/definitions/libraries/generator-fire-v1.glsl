vec3 fireRamp(float temperature){
 vec3 red=vec3(.3,.015,0),orange=vec3(1.,.28,0),yellow=vec3(1.,.8,.14),hot=vec3(1.,.93,.47);
 vec3 low=mix(vec3(.015,0,0),red,smoothstep(0.,.08,temperature));
 low=mix(low,orange,smoothstep(.08,.32,temperature));low=mix(low,yellow,smoothstep(.32,.72,temperature));return mix(low,hot,smoothstep(.72,1.,temperature));
}
vec4 generate(vec2 uv){
 float height=max(flameHeight,.01);float h=(uv.y-baseY)/height;vec2 p=vec2(uv.x-.5,uv.y-baseY);
 float normalizedX=abs(p.x)/max(width*(1.-clamp(h,0.,1.)*taper*.8),.01);
 vec2 stretched=p*warpScale*vec2(3.,1.)-vec2(0.,h*7.);
 vec2 first=vec2(gFbm(stretched*.7,int(octaves)),gFbm(stretched*.7+vec2(5.2,1.3),int(octaves)))*warp*1.5;
 vec2 second=vec2(gFbm(stretched+first*4.+vec2(1.7,9.2),int(octaves)),gFbm(stretched+first*4.+vec2(8.3,2.8),int(octaves)))*warp*.85;
 vec2 fine=vec2(gSigned((stretched+first+second)*3.5+vec2(13.1,7.4)),gSigned((stretched+first+second)*3.5+vec2(3.7,11.2)))*warp*.4*(1.+smoothstep(.3,.9,normalizedX)*2.);
 vec2 warped=stretched+first+second+fine;
 float turbulence=gRidged(warped,int(octaves))*1.6+gTurb(warped*2.+vec2(30,70),max(2,int(octaves)-1))*.5+gTurb(warped*5.+vec2(50,20),max(2,int(octaves)-2))*.15+abs(gSigned(warped*10.+vec2(77,33)))*.06;
 float channels=.35+.65*(gRidged(vec2(p.x*warpScale*3.6+seed*.3,h*.4),3)+gRidged(vec2(p.x*warpScale*7.5+50.+seed*.7,h*.6),2)*.4);
 float tongueHeight=gRidged(vec2(p.x*6.+seed*.5,0),2)*disparity;
 float tips=1.-smoothstep(tongueHeight,tongueHeight+.3,h);
 float fuel=.2+fillAmount*.8-h*(1.2+max(h,0.)*.5)+turbulence*(.8+fillAmount*.2);
 float silhouette=1.-smoothstep(.3,1.05,normalizedX);
 silhouette=clamp(silhouette+gFbm(warped*2.5,max(2,int(octaves)-1))*.45*(1.-normalizedX*.4),0.,1.);
 float density=pow(clamp(fuel*channels*tips*silhouette,0.,1.5),1.9-fillAmount*.6);
 density*=1.-flicker*(gFbm(p*3.+seed*10.,2)*.3+gSigned(vec2(p.x*10.,seed*5.))*.15);
 density*=smoothstep(-.03,.02,h);density=clamp(density,0.,1.);
 float core=pow(max(0.,1.-normalizedX),1.2);
 float heat=clamp(density*mix(edgeTemp*.4,coreTemp,core)*(1.-h*.4),0.,1.);
 float textureValue=.45+gTurb(warped*2.+vec2(17.3,53.1),max(3,int(octaves)-1))*1.1;
 vec3 emitted=fireRamp(heat)*mix(1.,textureValue,density*(1.-smoothstep(.25,.85,normalizedX))*(1.-h*.55)*.72)*intensity;
 float alpha=smoothstep(0.,.04,density);
 emitted*=alpha;
 float bed=(1.-smoothstep(-.03,.08,h))*(1.-smoothstep(0.,width*1.6,abs(p.x)))*width*3.5;
 bed*=1.+abs(gFbm(vec2(p.x*18.,seed*3.),3))*.5;emitted+=vec3(1,.5,.1)*bed*intensity*.6;alpha=max(alpha,bed*.6);
 float fogField=fbm(vec2(p.x*warpScale*1.3,p.y*warpScale*.55)+first*.45+seed*.03);
 float mist=fogField*(1.-smoothstep(-.05,1.1,h))*(1.-smoothstep(0.,1.6,normalizedX*(1.+max(h,0.)*.6)))*fogBase;
 emitted+=mix(vec3(.5,.1,0),vec3(.9,.38,.04),fogField)*mist*intensity*.7;alpha=max(alpha,mist*.6);
 float sparkZone=smoothstep(.1,.5,h)*(1.-smoothstep(.6,1.4,h))*(1.-smoothstep(0.,width*2.5,abs(p.x)));
 float specks=smoothstep(.7,.95,gSigned(p*vec2(55,60)+seed+first*4.))*sparkZone;
 emitted+=vec3(1,.6,.15)*specks*intensity;alpha=max(alpha,specks*.9);
 // Smoke has its own rising, widening volume behind the emissive flame.
 // Height and spread change the plume silhouette rather than multiplying opacity.
 float smokeStart=baseY+height*.28;
 float smokeHeight=max((1.-smokeStart)*mix(.2,1.,clamp(smokeRise,0.,1.)),.01);
 float smokeT=(uv.y-smokeStart)/smokeHeight;
 vec2 smokeCoord=vec2(p.x*warpScale*1.6,smokeT*2.8);
 vec2 smokeWarp=gWarp(smokeCoord, int(octaves));
 float drift=smokeWarp.x*(.04+.12*clamp(smokeT,0.,1.));
 float smokeWidth=.035+width*.1+smokeSpread*.23+clamp(smokeT,0.,1.)*(.04+smokeSpread*.25);
 float smokeX=abs(p.x-drift)/max(smokeWidth,.01);
 float plume=1.-smoothstep(.25,1.,smokeX);
 plume*=smoothstep(0.,.12,smokeT)*(1.-smoothstep(.55,1.,smokeT));
 float billows=clamp(.6+gFbm(smokeCoord+smokeWarp*3.,int(octaves))*1.3,.12,1.);
 float smoke=clamp(smokeMix,0.,1.)*(1.-exp(-max(smokeDensity,0.)*plume*billows*3.));
 alpha=clamp(alpha,0.,1.);
 float smokeBehind=smoke*(1.-alpha);
 emitted+=mix(vec3(.22,.20,.18),vec3(.42,.39,.35),billows)*smokeBehind;
 alpha+=smokeBehind;
 return vec4(alpha>.00001?emitted/alpha:vec3(0),alpha);
}
