// Continuous strips share vertices along U. Coverage is integrated in pixel space,
// so subpixel strands retain their energy when the output is reduced in size.
export function ribbonWork(settings,width){
 const bound=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(value)?Math.round(value):fallback));
 return {strands:bound(settings.strandCount,8,1024,480),layers:bound(settings.layerCount,1,4,2),steps:bound(Math.ceil(width/4+settings.waveCount*24+settings.noiseFrequency*8),64,1024,256)};
}
export function ribbonVertex(path,defines,{particles=false}={}){return `#version 300 es
precision highp float;precision highp int;
uniform float gp[64],time,generatorSeed;uniform vec2 generatorResolution;
uniform int ribbonSteps,ribbonStrands;out float ribbonAcross,ribbonHalfWidth,ribbonWeight;
${defines}
${path}
void main(){
 int index=gl_VertexID/2;float x=float(index)/float(ribbonSteps),side=gl_VertexID%2==0?-1.:1.;
 float count=float(ribbonStrands),layer=floor(float(gl_InstanceID)/count),strand=mod(float(gl_InstanceID),count);
 float s=(strand+.5)/count*2.-1.;vec2 curve=ribbonCurve(x,s,layer),p=vec2(x,curve.x);
 vec2 tangent=vec2(1.,curve.y)*generatorResolution;
 vec2 normal=normalize(vec2(-tangent.y,tangent.x));
 float variation=${particles?'mix(1.,.3+1.4*ribbonHash(strand+layer*139.+71.),strandVariation)':'1.'};
 float width=max(.01,strandWidth*variation*generatorResolution.y*.5),padding=width+1.;
 p+=normal*side*padding/generatorResolution;
 ribbonAcross=side*padding;ribbonHalfWidth=width;
 ribbonWeight=strandOpacity*${particles?'mix(1.,.15+1.3*ribbonHash(strand+layer*1901.),strandVariation)':'(.7+.6*ribbonHash(strand+layer*1901.))'};
 gl_Position=vec4(p*2.-1.,0,1);
}`;}
export const ribbonFragment=`#version 300 es
precision highp float;in float ribbonAcross,ribbonHalfWidth,ribbonWeight;out vec4 result;
void main(){
 float coverage=max(0.,min(ribbonAcross+.5,ribbonHalfWidth)-max(ribbonAcross-.5,-ribbonHalfWidth));
 float density=coverage*ribbonWeight;result=vec4(density);
}`;
// The membrane is a continuous sheet, with separate coverage, rim and crease light.
export function membraneVertex(path,defines){return `#version 300 es
precision highp float;precision highp int;
uniform float gp[64],time,generatorSeed;uniform vec2 generatorResolution;
uniform int ribbonSteps,ribbonStrands;out float filmSide,filmFacing;
${defines}
${path}
void main(){
 float x=float(gl_VertexID/2)/float(ribbonSteps),cell=mod(float(gl_InstanceID),float(ribbonStrands)),layer=floor(float(gl_InstanceID)/float(ribbonStrands));
 float s=(cell+float(gl_VertexID%2))/float(ribbonStrands)*2.-1.;
 s*=1.+min(.25,4./max(1.,bandWidth*generatorResolution.y));
 vec2 curve=ribbonCurve(x,s,layer);float epsilon=.002;
 float across=(ribbonCurve(x,s+epsilon,layer).x-ribbonCurve(x,s-epsilon,layer).x)/(2.*epsilon);
 filmSide=s;filmFacing=abs(across)/max(.001,bandWidth*.5);
 gl_Position=vec4(x*2.-1.,curve.x*2.-1.,0,1);
}`;}
export function membraneFragment(defines){return `#version 300 es
precision highp float;in float filmSide,filmFacing;out vec4 result;
uniform float gp[64];uniform vec2 generatorResolution;
${defines}
vec3 filmColor(float packed){return vec3(floor(packed/65536.),mod(floor(packed/256.),256.),mod(packed,256.))/255.;}
void main(){
 float distance=(1.-abs(filmSide))/max(fwidth(filmSide),.00001);
 float coverage=clamp(distance+.5,0.,1.);
 float rim=1.-smoothstep(edgeWidth*generatorResolution.y,edgeWidth*generatorResolution.y+1.,distance);
 float crease=pow(1.-clamp(filmFacing,0.,1.),3.);
 float body=interiorOpacity,edge=edgeBrightness*rim,fold=creaseBrightness*crease;
 vec3 density=filmColor(baseTint)*(body+fold)+filmColor(edgeTint)*edge;
 result=vec4(density,body+edge+fold)*coverage;
}`;}
