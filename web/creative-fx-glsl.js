// Original WebGL2 implementations. Coordinates use the node's 512px short-edge grid.
export const CREATIVE_FX_GLSL=`
float artHash(vec2 p){uvec2 q=uvec2(ivec2(floor(p)));uint v=q.x*1664525u+q.y*1013904223u;v^=v>>16u;v*=2246822519u;v^=v>>13u;return float(v&16777215u)/16777216.;}
vec2 artGrid(){return fxPosition()*fxMetric*512.;}
vec2 artUV(vec2 p){return fxTexture(p/(fxMetric*512.));}
float artTone(vec2 p){vec4 s=fxColor(p);return fxLuma(clamp(fxStraight(s),0.,1.));}
float artDot(vec2 p,float angle,int channel){
 float a=radians(angle),cs=cos(a),sn=sin(a),size=fxData[0].x;mat2 turn=mat2(cs,sn,-sn,cs);
 vec2 cell=floor(turn*p/size),offset=vec2(artHash(cell+fxData[1].z),artHash(cell+fxData[1].z+91.))-.5;
 vec2 center=(cell+.5+offset*fxData[1].y*.6)*size,sampleAt=transpose(turn)*center;
 vec3 rgb=clamp(fxStraight(fxColor(artUV(sampleAt))),0.,1.);float ink=1.-(channel<0?fxLuma(rgb):rgb[channel]);
 vec2 local=(turn*p-center)/size;float distance=fxData[0].z<.5?length(local):fxData[0].z<1.5?max(abs(local.x),abs(local.y)):abs(local.y);
 float radius=fxData[0].z>1.5?ink*.5:fxData[0].z>.5?sqrt(ink)*.5:ink<.785398?sqrt(ink)*.56419:mix(.5,.707107,(ink-.785398)/.214602),aa=max(fwidth(distance),.002);
 return ink<=.00001?0.:ink>=.99999?1.:1.-smoothstep(radius-aa,radius+aa,distance);
}
float artBayer(ivec2 p,int count){
 int result=0;for(int i=0;i<3;i++){if(i>=count)break;int x=(p.x>>i)&1,y=(p.y>>i)&1;result=result*4+((x^y)*2+y);}
 return (float(result)+.5)/float(count==2?16:64)-.5;
}
// Five-column, seven-row density glyphs; embedded data avoids platform fonts/network assets.
const int artGlyphs[70]=int[70](
 0,0,0,0,0,0,0, 0,0,0,0,0,12,12, 0,12,12,0,12,12,0,
 0,0,0,31,0,0,0, 0,0,31,0,31,0,0, 0,4,4,31,4,4,0,
 0,21,14,31,14,21,0, 10,10,31,10,31,10,10,
 17,18,4,4,8,9,17, 14,17,23,21,23,16,14);
float artGlyph(vec2 local,float tone,int kind){
 ivec2 p=ivec2(floor(vec2(local.x,1.-local.y)*vec2(6.,8.)));if(p.x>=5||p.y>=7)return 0.;
 if(kind==1)return step(float(p.y)/7.,tone);
 if(kind==2){int row=tone<.5?(p.y==0||p.y==6?14:17):(p.y==6?14:p.y==0?4:p.y==1?12:4);return float((row>>(4-p.x))&1);}
 int glyph=clamp(int(tone*9.999),0,9);return float((artGlyphs[glyph*7+p.y]>>(4-p.x))&1);
}
void applyCreativeFx(inout vec4 c,inout float h){
 vec4 original=c;float originalHeight=h;
 if(operation==32){
  vec2 p=artGrid();vec3 rgb;
  if(fxData[0].w<.5)rgb=mix(fxColors[1],fxColors[0],artDot(p,fxData[0].y,-1));
  else rgb=vec3(1)-vec3(artDot(p,fxData[0].y,0),artDot(p,fxData[0].y+30.,1),artDot(p,fxData[0].y+60.,2));
  c.rgb=rgb*c.a;
 }
 if(operation==33){
  vec2 cell=floor(artGrid()/fxData[0].x),q=artUV((cell+.5)*fxData[0].x);vec3 rgb=clamp(fxStraight(fxColor(q)),0.,1.);
  float noise=fxData[0].y>1.5?artHash(cell+fxData[1].y)-.5:artBayer(ivec2(cell),fxData[0].y<.5?2:3);
  float levels=fxData[0].w-1.,offset=noise*fxData[1].x;
  if(fxData[0].z<.5)rgb=clamp(floor(rgb*levels+.5+offset)/levels,0.,1.);
  else {float luma=fxLuma(rgb),value=clamp(floor(luma*levels+.5+offset)/levels,0.,1.);
   if(fxData[0].z<1.5)rgb=vec3(value);
   else if(fxData[0].z<2.5)rgb=mix(fxColors[0],fxColors[1],step(.5,luma+offset));
   else {value=clamp(floor(luma*3.+.5+offset)/3.,0.,1.);rgb=mix(fxColors[0],fxColors[1],value);}
  }c.rgb=rgb*c.a;
 }
 if(operation==34){
  vec2 p=fxPosition(),axis=fxData[0].w<.5?vec2(1,0):vec2(0,1);float row=floor(dot(p,axis.yx)*fxData[0].x);
  float epoch=fxData[1].x+fxData[1].y,seed=fxData[1].z;
  float gate=fxData[0].z<=0.?0.:step(artHash(vec2(row+seed,epoch)),fxData[0].z),shift=(artHash(vec2(row+seed+17.,epoch))-.5)*2.*fxData[0].y*gate;
  vec2 q=fxTexture(p+axis*shift/fxMetric/512.),d=axis*fxData[1].w/(fxMetric*512.*fxBounds.zw)*gate;
  c=fxColor(q);h=fxHeight(q);vec4 r=fxColor(q+d),b=fxColor(q-d);c=vec4(r.r,c.g,b.b,max(c.a,max(r.a,b.a)));
 }
 if(operation==35){
  vec2 p=fxPosition(),v=(p-fxData[0].xy)*fxMetric;float radius=length(v),falloff=1.-smoothstep(fxData[0].z,max(fxData[0].z+.0001,fxData[0].w),radius);
  vec2 direction=radius>.000001?v/radius/fxMetric:vec2(0);vec4 sum=vec4(0);float sh=0.;int count=int(fxData[1].z);
  for(int i=0;i<32;i++){if(i>=count)break;float t=float(i)/float(count-1);if(fxData[1].y>1.5)t=t*2.-1.;else if(fxData[1].y>.5)t=-t;
   vec2 q=fxTexture(p-direction*t*fxData[1].x/512.*falloff);sum+=fxColor(q);sh+=fxHeight(q);}
  c=sum/float(count);h=sh/float(count);
 }
 if(operation==36){
  vec2 delta=1./vec2(textureSize(srcColor,0));float gx=artTone(uv+vec2(delta.x,0))-artTone(uv-vec2(delta.x,0)),gy=artTone(uv+vec2(0,delta.y))-artTone(uv-vec2(0,delta.y));
  vec2 tangent=length(vec2(gx,gy))>.00001?normalize(vec2(-gy,gx)):vec2(1,0);mat2 turn=mat2(tangent,vec2(-tangent.y,tangent.x));
  vec3 means[8],squares[8];float counts[8];for(int i=0;i<8;i++){means[i]=vec3(0);squares[i]=vec3(0);counts[i]=0.;}
  int steps=int(fxData[0].w);bool directional=fxData[0].y>.5;
  for(int y=-6;y<=6;y++)for(int x=-6;x<=6;x++){if(abs(x)>steps||abs(y)>steps)continue;vec2 v=vec2(x,y)/float(steps);if(directional&&dot(v,v)>1.)continue;
   vec2 offset=directional?turn*(v*vec2(1.+fxData[1].x,1.-fxData[1].x*.7)):v;
   vec4 sampleColor=fxColor(uv+offset*contourStep);vec3 rgb=fxStraight(sampleColor);float weight=sampleColor.a;
   if(directional){float angle=atan(v.y,v.x);int sector=int(floor((angle+3.14159265)*1.27323954))%8;means[sector]+=rgb*weight;squares[sector]+=rgb*rgb*weight;counts[sector]+=weight;}
   else for(int i=0;i<4;i++){vec2 signV=vec2((i&1)==0?-1.:1.,(i&2)==0?-1.:1.);if(v.x*signV.x<0.||v.y*signV.y<0.)continue;means[i]+=rgb*weight;squares[i]+=rgb*rgb*weight;counts[i]+=weight;}
  }
  vec3 sum=vec3(0);float total=0.;for(int i=0;i<8;i++){if(!directional&&i>=4)break;if(counts[i]<=.00001)continue;vec3 mean=means[i]/counts[i],variance=max(vec3(0),squares[i]/counts[i]-mean*mean);float weight=1./(1.+pow(max(.00001,dot(variance,vec3(33.3333))),fxData[0].z*.5));sum+=mean*weight;total+=weight;}
  if(total>0.)c.rgb=sum/total*c.a;
 }
 if(operation==37){
  vec2 d=contourStep;float l=fxData[0].x<.5?fxColor(uv-vec2(d.x,0)).a:fxHeight(uv-vec2(d.x,0)),r=fxData[0].x<.5?fxColor(uv+vec2(d.x,0)).a:fxHeight(uv+vec2(d.x,0));
  float b=fxData[0].x<.5?fxColor(uv-vec2(0,d.y)).a:fxHeight(uv-vec2(0,d.y)),t=fxData[0].x<.5?fxColor(uv+vec2(0,d.y)).a:fxHeight(uv+vec2(0,d.y));
  vec3 normal=normalize(vec3((l-r)*fxData[0].y,(b-t)*fxData[0].y,1.)),light=vec3(cos(fxData[0].z)*cos(fxData[0].w),sin(fxData[0].z)*cos(fxData[0].w),sin(fxData[0].w));
  float shade=dot(normal,light)-light.z;vec3 rgb=fxStraight(c);rgb=mix(rgb,fxColors[0],clamp(shade,0.,1.));rgb=mix(rgb,fxColors[1],clamp(-shade,0.,1.));c.rgb=rgb*c.a;
 }
 if(operation==38){
  vec4 small=texture(tableTex,uv),large=texture(dstColor,uv);float a=small.a>.00001?fxLuma(small.rgb/small.a):0.,b=large.a>.00001?fxLuma(large.rgb/large.a):0.;
  float d=(a-b)*fxData[0].x,ink=1.-smoothstep(fxData[0].y-fxData[0].z,fxData[0].y+fxData[0].z,d);
  vec3 paper=fxData[0].w>.5?fxStraight(c):fxColors[1];c.rgb=mix(paper,fxColors[0],ink)*c.a;
 }
 if(operation==39){
  vec2 p=fxPosition(),v=(p-.5)*2.;p=.5+v*(1.+fxData[0].x*dot(v,v))*.5;c=fxColor(fxTexture(p));h=fxHeight(fxTexture(p));
  vec2 grid=p*fxMetric*512.;float epoch=fxData[1].x+fxData[1].y;
  float scan=1.-fxData[0].z*(.5+.5*cos(6.2831853*(p.y*fxData[0].y+fxData[1].y)));
  float noise=(artHash(floor(grid)+vec2(fxData[1].z,epoch))-.5)*fxData[1].w;
  float flicker=1.-fxData[2].x*artHash(vec2(epoch,fxData[1].z)),shade=1.-fxData[2].y*clamp(dot(v,v)*.5,0.,1.);
  int stripe=int(mod(floor(grid.x),3.));vec3 mask=vec3(1.-fxData[0].w);mask[stripe]=1.;c.rgb=max(vec3(0),fxStraight(c)*scan*flicker*shade*mask+noise)*c.a;
 }
 if(operation==40){
  vec2 cellSize=vec2(fxData[0].x*.75,fxData[0].x),p=artGrid()/cellSize,cell=floor(p);vec4 sampleColor=fxColor(artUV((cell+.5)*cellSize));
  float tone=clamp(fxLuma(fxStraight(sampleColor)),0.,1.);if(fxData[0].w>.5)tone=1.-tone;
  float coverage=artGlyph(fract(p),tone,int(fxData[0].y)),alpha=mix(fxData[1].x,1.,coverage);
  vec3 ink=fxData[0].z>.5?fxStraight(sampleColor):fxColors[0];c=vec4(mix(fxColors[1]*fxData[1].x,ink,coverage)*c.a,c.a*alpha);h*=alpha;
 }
 if(operation==41){vec2 offset=texture(tableTex,uv).xy;c=fxColor(uv+offset);h=fxHeight(uv+offset);}
 c=mix(original,c,fxAmount);h=mix(originalHeight,h,fxAmount);
}
`;
