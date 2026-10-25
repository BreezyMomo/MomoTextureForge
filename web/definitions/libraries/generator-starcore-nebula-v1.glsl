vec4 generate(vec2 uv){
 vec2 p=(uv*2.-1.)/max(sceneScale,.2);float ph=time*6.28318530718/max(loopDuration,.1);float sd=seed*.137;vec3 c=vec3(0);
 c+=spaceLayer(p,ph,sd)*nebulaAmount;
 c=1.-exp(-max(c,vec3(0))*exposure);
 float edge=1.-smoothstep(.87,1.1,length(p));
 c*=.5+.5*edge;return vec4(c,1.);
}
