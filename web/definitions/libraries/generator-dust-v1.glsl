float dustLayer(vec2 uv,float cellSize,float sizeScale,float densityScale,float offset,bool fibers){
 vec2 cell=floor(uv/cellSize);float total=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)for(int i=0;i<3;i++){
  vec2 neighbor=cell+vec2(x,y),key=neighbor*17.31+seed+offset+float(i)*31.71;
  float chance=hash21(key),clusterNoise=hash21(floor(uv/(cellSize*4.))+offset);
  float threshold=(density*density*.55+density*.15)*densityScale+(clusterNoise-.5)*cluster*.5;
  if(chance>threshold)continue;
  vec2 center=(neighbor+vec2(hash21(key+73.1),hash21(key+74.2)))*cellSize;
  float sizeRandom=hash21(key+11.3),softRandom=hash21(key+23.7),lightRandom=hash21(key+37.1),shapeRandom=hash21(key+51.9),angleRandom=hash21(key+67.3);
  float radius=mix(.001,.035,size*size*.25)*sizeScale*(.15+.85*pow(sizeRandom,mix(3.,.5,sizeVariation)));
  float sigma=max(radius*.2,radius*mix(.3,1.5,softness)*(1.+(softRandom-.5)*softVariation));
  float light=brightness*(1.-brightnessVariation*(1.-lightRandom))*(.3+.7*lightRandom);
  vec2 delta=uv-center;
  if(fibers&&shapeRandom<fiberAmount){vec2 dir=vec2(cos(angleRandom*PI),sin(angleRandom*PI));float along=dot(delta,dir),across=dot(delta,vec2(-dir.y,dir.x));float halfLength=radius*mix(3.,12.,fiberLength)*(.5+angleRandom*.8);across+=(hash21(key+83.7)-.5)*irregularity*.3*along*along/max(halfLength,.001);float w=radius*.15*(.5+softRandom*.5);total+=(1.-smoothstep(max(halfLength-w*2.,0.),halfLength,abs(along)))*(1.-smoothstep(0.,max(w,.00001),abs(across)))*light*(.4+.6*(.5+.5*sin(along*80.+angleRandom*20.)))*.7;}
  else{float angle=atan(delta.y,delta.x);float distortion=1.+irregularity*.4*(sin(angle*3.+shapeRandom*20.)*.5+sin(angle*7.+angleRandom*30.)*.3+sin(angle*13.+sizeRandom*40.)*.2);delta*=distortion;total+=exp(-dot(delta,delta)/max(2.*sigma*sigma,.00000001))*light;}
 }
 return total;
}
vec4 generate(vec2 uv){float value=dustLayer(uv,.031,.5,1.,0.,false)+dustLayer(uv+vec2(.1731,.4197),.063,1.2,.65,41.71,true)+dustLayer(uv+vec2(.5193,.2371),.11,2.2,.3,89.31,false);float alpha=clamp(value*opacityAmount,0.,1.);return vec4(mix(vec3(1),vec3(1,.92,.78),warmth*.5),alpha);}
