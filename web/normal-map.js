export const NORMAL_GLSL=`
uniform int normalAlgorithm,normalInvert;
uniform vec2 normalSigns;
uniform float normalSmooth;
// Keep authored slope and smoothing stable when preview/export sampling size changes.
// A 512-pixel short edge preserves the existing default export strength.
float normalSamplingScale(){return 1./(512.*max(pixel.x,pixel.y));}
float smoothHeightSample(vec2 p){
 vec2 t=p/pixel-.5,f=fract(t),base=(floor(t)+.5)*pixel;
 return mix(mix(h(base),h(base+vec2(pixel.x,0)),f.x),mix(h(base+vec2(0,pixel.y)),h(base+pixel),f.x),f.y);
}
float normalHeight(vec2 p){
 if(normalSmooth<=0.)return h(p);
 vec2 d=pixel*normalSmooth*normalSamplingScale();float sum=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)sum+=smoothHeightSample(p+vec2(x,y)*d)*float((x==0?2:1)*(y==0?2:1));
 return sum/16.;
}
vec3 surfaceNormal(vec2 p){
 float diagonal=normalAlgorithm==1?3.:1.,middle=normalAlgorithm==1?10.:2.,scale=normalAlgorithm==1?.25:1.;
 float tl=normalHeight(p+pixel*vec2(-1,-1)),tc=normalHeight(p+pixel*vec2(0,-1)),tr=normalHeight(p+pixel*vec2(1,-1));
 float ml=normalHeight(p+pixel*vec2(-1,0)),mr=normalHeight(p+pixel*vec2(1,0));
 float bl=normalHeight(p+pixel*vec2(-1,1)),bc=normalHeight(p+pixel*vec2(0,1)),br=normalHeight(p+pixel*vec2(1,1));
 vec2 gradient=vec2(diagonal*(tl+bl-tr-br)+middle*(ml-mr),diagonal*(tl+tr-bl-br)+middle*(tc-bc))*scale;
 return normalize(vec3(gradient*normalSamplingScale()*strength*normalSigns*(normalInvert==1?-1.:1.),1.));
}
`;
export function setNormalUniforms(gl,loc,output){
 gl.uniform1i(loc('normalAlgorithm'),output.normalAlgorithm==='scharr'?1:0);
 gl.uniform1i(loc('normalInvert'),+!!output.normalInvert);
 gl.uniform2f(loc('normalSigns'),output.normalFlipX?-1:1,output.normalFlipY?-1:1);
 gl.uniform1f(loc('normalSmooth'),output.normalSmooth??0);
}
