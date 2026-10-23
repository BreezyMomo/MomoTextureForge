// Effects over the current node composite; progress is authored/keyframed, never accumulated.
const number=(key,min,max,value,step=.01)=>({key,label:'fx.param.'+key,min,max,default:value,step});
const select=(key,options,value=0)=>({...number(key,0,options.length-1,value,1),options});
const color=(key,value)=>({key,label:'fx.param.'+key,type:'color',default:value});
export const CONTENT_EFFECTS=[
 {id:'dissolve',parameters:[number('progress',0,1,.35),select('dissolveStyle',['softDissolve','burnDissolve'],1),select('dissolvePattern',['cloudDissolve','cellDissolve','directionalDissolve']),number('dissolveScale',8,256,48,1),number('dissolveAngle',-180,180,90,1),number('edgeWidth',0,.3,.08),color('burnColor','#ff9d38'),number('edgeSoftness',0,.15,.015,.001),number('seed',1,65535,19,1),number('mix',0,1,1)]},
 {id:'shockwave',parameters:[number('progress',0,1,.4),number('centerX',0,1,.5),number('centerY',0,1,.5),number('waveRadius',.01,2,.9),number('waveWidth',2,192,64,1),number('displacement',0,128,24,.5),number('waveDecay',0,1,.6),number('mix',0,1,1)]},
 {id:'liquidFusion',parameters:[number('fusionRadius',0,64,16,.5),number('fusionThreshold',.05,.95,.35),number('fusionSoftness',.005,.4,.06,.005),select('fusionColor',['sourceLiquidColor','uniformLiquidColor']),color('liquidColor','#50dfc0'),number('mix',0,1,1)]}
];
export function contentEffectActive(id,v){
 if(!(v.mix>0))return false;
 if(id==='dissolve')return v.progress>0;
 if(id==='shockwave')return v.progress>0&&v.progress<1&&v.displacement>0;
 if(id==='liquidFusion')return v.fusionRadius>0;
 return false;
}
export const CONTENT_FX_GLSL=`
// Bilinear premultiplied sampling with transparent border taps, or wrapped taps.
vec4 contentTap(sampler2D tex,ivec2 p){
 ivec2 size=textureSize(tex,0);
 if(repeatNode==1)p=ivec2(mod(vec2(p),vec2(size)));
 else if(any(lessThan(p,ivec2(0)))||any(greaterThanEqual(p,size)))return vec4(0);
 return texelFetch(tex,p,0);
}
vec4 contentSample(sampler2D tex,vec2 logical){
 if(repeatNode==1)logical=fract(logical);
 vec2 p=fxTexture(logical)*vec2(textureSize(tex,0))-.5;ivec2 i=ivec2(floor(p));vec2 f=fract(p);
 return mix(mix(contentTap(tex,i),contentTap(tex,i+ivec2(1,0)),f.x),mix(contentTap(tex,i+ivec2(0,1)),contentTap(tex,i+ivec2(1,1)),f.x),f.y);
}
float dissolveHash(vec2 p){
 uvec2 q=uvec2(ivec2(p));uint v=q.x*1664525u+q.y*1013904223u+uint(fxData[1].w)*747796405u;
 v^=v>>16u;v*=2246822519u;v^=v>>13u;return float(v&16777215u)/16777216.;
}
float dissolveNoise(vec2 p,vec2 period){
 vec2 i=floor(p),f=fract(p),a=i,b=i+1.;if(repeatNode==1){a=mod(a,period);b=mod(b,period);}
 f=f*f*f*(f*(f*6.-15.)+10.);
 return mix(mix(dissolveHash(a),dissolveHash(vec2(b.x,a.y)),f.x),mix(dissolveHash(vec2(a.x,b.y)),dissolveHash(b),f.x),f.y);
}
float dissolveField(vec2 position){
 vec2 cells=512.*fxMetric/fxData[0].w;if(repeatNode==1)cells=max(vec2(1),floor(cells+.5));
 vec2 p=position*cells;float value=0.;
 if(fxData[0].z<.5||fxData[0].z>1.5){
  value=(dissolveNoise(p,cells)*4.+dissolveNoise(p*2.+17.,cells*2.)*2.+dissolveNoise(p*4.+31.,cells*4.))/7.;
  if(fxData[0].z>1.5){vec2 direction=vec2(cos(fxData[1].x),sin(fxData[1].x));value=dot(position-.5,direction)/max(.0001,abs(direction.x)+abs(direction.y))+.5+(value-.5)*.2;}
 }else{
  vec2 base=floor(p);float nearest=2.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
   vec2 cell=base+vec2(x,y),hashCell=repeatNode==1?mod(cell,cells):cell;
   vec2 point=cell+vec2(dissolveHash(hashCell),dissolveHash(hashCell+vec2(43,71)));
   nearest=min(nearest,length(p-point));
  }value=nearest*.8;
 }
 return clamp(value,.0001,.9999);
}
void applyContentFx(inout vec4 c,inout float h){
 if(operation==43){
  if(fxData[0].x>=1.){c*=1.-fxAmount;h*=1.-fxAmount;return;}
  float soft=fxData[1].z,threshold=mix(-soft,1.+soft,fxData[0].x);
  float distance=dissolveField(fxPosition())-threshold;
  float coverage=soft>0.?smoothstep(-soft,soft,distance):step(0.,distance);
  vec3 rgb=fxStraight(c);
  if(fxData[0].y>.5&&fxData[1].y>0.){
   float edge=(1.-smoothstep(0.,fxData[1].y,max(0.,distance)))*smoothstep(0.,.05,fxData[0].x);
   float charred=smoothstep(.1,.3,edge)*(1.-smoothstep(.65,.9,edge));
   rgb=mix(rgb,rgb*.2,charred*.8);rgb=mix(rgb,fxColors[0],edge*edge);
  }
  c=mix(c,vec4(rgb*c.a,c.a)*coverage,fxAmount);h=mix(h,h*coverage,fxAmount);
 }
 if(operation==44){
  vec2 delta=(fxPosition()-fxData[0].xy)*fxMetric;float distance=length(delta),width=fxData[0].w/1024.;
  float p=fxData[1].x,band=(distance-p*fxData[0].z)/width;
  float envelope=abs(band)<1.?.5+.5*cos(3.14159265359*band):0.;
  float fade=smoothstep(0.,.08,p)*(1.-smoothstep(.85,1.,p))*(1.-fxData[1].z*p);
  float shift=sin(6.28318530718*band)*envelope*fxData[1].y/512.*fade*fxAmount;
  vec2 q=fxPosition()+(distance>.00001?delta/distance:vec2(0))*shift/fxMetric;
  c=contentSample(srcColor,q);h=contentSample(srcHeight,q).r;
 }
 if(operation==45){
  vec4 blurred=texture(dstColor,uv);float height=texture(dstHeight,uv).r;
  float coverage=smoothstep(max(.0001,fxData[0].x-fxData[0].y),min(1.,fxData[0].x+fxData[0].y),blurred.a);
  vec3 rgb=fxData[0].z>.5?fxColors[0]:fxStraight(blurred);
  float fusedHeight=blurred.a>.00001?height/blurred.a*coverage:0.;
  c=mix(c,vec4(rgb*coverage,coverage),fxAmount);h=mix(h,fusedHeight,fxAmount);
 }
}
`;
