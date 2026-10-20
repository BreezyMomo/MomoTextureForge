vec4 generate(vec2 uv){
 vec2 offset=seed*vec2(.137,.293)+vec2(3.7,1.4);
 vec2 p=rot(uv*scale,.4)+offset+vec2(.12,-.18)*time*motionSpeed;
 vec2 first=vec2(gFbm(p+offset,4),gFbm(p+offset+vec2(5.2,1.3),4));
 vec2 second=vec2(gFbm(p+first*turbulence*4.+offset+vec2(1.7,9.2),int(detail)),gFbm(p+first*turbulence*4.+offset+vec2(8.3,2.8),int(detail)));
 float field=.5+.5*gFbm(p+second*turbulence*2.+offset,int(detail));
 float lighting=.6*gFbm(p*1.5+offset+vec2(20,7),4)+.4*gFbm(p*3.+offset+vec2(50,30),3);
 float value=clamp(field*mix(1.,.35+lighting*1.3,depth)*density*1.6,0.,1.);
 return vec4(value);
}
