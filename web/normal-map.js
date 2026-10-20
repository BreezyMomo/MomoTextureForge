export const NORMAL_GLSL=`
uniform int normalAlgorithm,normalInvert;
uniform vec2 normalSigns;
uniform float normalSmooth;
float normalHeight(vec2 p){
 if(normalSmooth<=0.)return h(p);
 vec2 d=pixel*normalSmooth;float sum=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)sum+=h(p+vec2(x,y)*d)*float((x==0?2:1)*(y==0?2:1));
 return sum/16.;
}
vec3 surfaceNormal(vec2 p){
 float diagonal=normalAlgorithm==1?3.:1.,middle=normalAlgorithm==1?10.:2.,scale=normalAlgorithm==1?.25:1.;
 float tl=normalHeight(p+pixel*vec2(-1,-1)),tc=normalHeight(p+pixel*vec2(0,-1)),tr=normalHeight(p+pixel*vec2(1,-1));
 float ml=normalHeight(p+pixel*vec2(-1,0)),mr=normalHeight(p+pixel*vec2(1,0));
 float bl=normalHeight(p+pixel*vec2(-1,1)),bc=normalHeight(p+pixel*vec2(0,1)),br=normalHeight(p+pixel*vec2(1,1));
 vec2 gradient=vec2(diagonal*(tl+bl-tr-br)+middle*(ml-mr),diagonal*(tl+tr-bl-br)+middle*(tc-bc))*scale;
 return normalize(vec3(gradient*strength*normalSigns*(normalInvert==1?-1.:1.),1.));
}
`;
export function setNormalUniforms(gl,loc,output){
 gl.uniform1i(loc('normalAlgorithm'),output.normalAlgorithm==='scharr'?1:0);
 gl.uniform1i(loc('normalInvert'),+!!output.normalInvert);
 gl.uniform2f(loc('normalSigns'),output.normalFlipX?-1:1,output.normalFlipY?-1:1);
 gl.uniform1f(loc('normalSmooth'),output.normalSmooth??0);
}
