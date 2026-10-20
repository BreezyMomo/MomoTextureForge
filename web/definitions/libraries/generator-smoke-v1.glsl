float cloudFade(vec2 uv){if(style>0.5&&style<1.5)return 1.;if(style>1.5)return smoothstep(0.,.4,1.-uv.y);vec2 f=smoothstep(vec2(0),vec2(.25),uv)*smoothstep(vec2(0),vec2(.25),1.-uv);return f.x*f.y;}
float cloudSample(vec2 uv){return texture(input0,clamp(uv,0.,1.)).r*cloudFade(uv);}
vec4 generate(vec2 uv){
 vec2 flow=vec2(.18,-.32)*time*motionSpeed;
 vec2 warped=uv+(gWarp(uv*warpScale+flow,int(warpOctaves))+vec2(flowBias,0))*warpStrength;
 float density=cloudSample(warped);
 float edge=smoothstep(0.,.4,density);
 float coarse=gFbm(uv*warpScale*3.5+flow*2.+vec2(9.1,3.7),int(warpOctaves));
 float fine=gFbm(uv*warpScale*7.+flow*3.+vec2(2.4,6.1),max(1,int(warpOctaves)-2));
 density*=mix(1.,mix(coarse*.5+.5,1.,edge)*mix(fine*.3+.7,1.,.5+edge*.5),edgeBreakup);
 float rim=smoothstep(.1,.35,density)*(1.-smoothstep(.35,.7,density));
 density=max(0.,density+rim*gFbm(uv*warpScale*5.+flow*2.+vec2(3.3,7.7),3)*.08*edgeBreakup);
 float neighbor=0.;for(int axis=0;axis<4;axis++){vec2 dir=axis==0?vec2(1,0):axis==1?vec2(-1,0):axis==2?vec2(0,1):vec2(0,-1);neighbor+=cloudSample(warped+dir*softness*.012);}
 density=mix(density,neighbor*.25,softness*.4);
 if(finalBlur>0.){float blurred=0.;for(int i=0;i<8;i++){float angle=float(i)*TAU/8.;blurred+=cloudSample(warped+vec2(cos(angle),sin(angle))*finalBlur*.02);}density=mix(density,blurred*.125,finalBlur);}
 density=pow(max(0.,density),1./max(contrast,.01))*brightness;
 density=clamp(density/max(density+.15,.001)*1.15,0.,1.);
 if(depth>0.){float n=gFbm(uv*3.+flow+seed*vec2(1.7,.3),4)*.5+gFbm(uv*7.+flow*2.+seed*vec2(.9,2.1),3)*.35+gFbm(uv*13.+flow*3.+seed*vec2(2.3,.5),2)*.15;float mask=smoothstep(.04,.35,density);density=density*(1.-depth*mask*.65)+pow(max(n,0.),.6)*depth*mask;}
 return vec4(gColor(tint),clamp(density,0.,1.));
}
