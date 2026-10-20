vec4 generate(vec2 uv){
 vec2 warped=uv+gWarp(uv*warpScale,int(warpOctaves))*warpStrength;
 float value=texture(input0,clamp(warped,0.,1.)).r;
 float edge=smoothstep(0.,.4,value);
 float breakup=.5+.5*gFbm(uv*warpScale*3.5,int(warpOctaves));
 value*=mix(1.,mix(breakup,1.,edge),edgeBreakup);
 if(finalBlur>0.){float blurred=0.;for(int i=0;i<8;i++){float turn=float(i)*TAU/8.;blurred+=texture(input0,clamp(warped+vec2(cos(turn),sin(turn))*finalBlur*.02,0.,1.)).r;}value=mix(value,blurred/8.,finalBlur);}
 value=pow(max(value,0.),1./max(contrast,.01))*brightness;
 return vec4(gColor(tint),clamp(value/max(value+.15,.001)*1.15,0.,1.));
}
