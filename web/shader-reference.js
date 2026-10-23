import sources from './shader-reference-runtime.js';
import {encodeZIP} from './encoders.js';
import {messageError} from './message-catalog.js';
export const SHADER_REFERENCE_SCHEMA='momo.shader-reference/v1';
export const FILL_STYLES=['solid','hachure','crossHatch','dots','dashed','zigzag'];
export const SHADER_FIELDS=[
 ['gap',2,96,8,.5],['width',.25,12,1.1,.05],['angle',-180,180,-44,1],
 ['roughness',0,1,.25,.01],['seed',1,99999,1,1],['dashLength',1,128,8,.5],['dashGap',1,128,5,.5],
 ['inkOpacity',0,1,1,.01],['paperOpacity',0,1,0,.01],['scrollX',-64,64,0,.5],['scrollY',-64,64,0,.5]
].map(([key,min,max,value,step])=>({key,label:'shader.param.'+key,min,max,default:value,step}));
export const shaderDefaults=()=>({style:2,...Object.fromEntries(SHADER_FIELDS.map(s=>[s.key,s.default])),inkColor:'#e84449',paperColor:'#fff7ec'});
export function sanitizeShaderParameters(raw={}){
 const value=shaderDefaults();
 if(Number.isFinite(raw.style))value.style=Math.max(0,Math.min(5,Math.round(raw.style)));
 for(const s of SHADER_FIELDS)if(Number.isFinite(raw[s.key]))value[s.key]=Math.max(s.min,Math.min(s.max,s.step===1?Math.round(raw[s.key]):raw[s.key]));
 for(const key of ['inkColor','paperColor'])if(/^#[0-9a-f]{6}$/i.test(raw[key]))value[key]=raw[key].toLowerCase();
 return value;
}
export function parseShaderSettings(text){
 let raw;try{raw=JSON.parse(text);}catch{throw messageError('shader.invalidSettings');}
 if(raw?.schema!==SHADER_REFERENCE_SCHEMA||raw.effect!=='handdrawnFill'||raw.version!==1||!raw.parameters||typeof raw.parameters!=='object')throw messageError('shader.invalidSettings');
 return sanitizeShaderParameters(raw.parameters);
}
export function sketchShaderParameters(values){
 const style=({1:0,2:1,3:2,6:3,7:4,8:5})[values.fillStyle];
 if(style===undefined)throw messageError('shader.unsupportedFill');
 return sanitizeShaderParameters({...shaderDefaults(),style,gap:values.hatchGap,width:values.hatchWidth,angle:values.hatchAngle,
  roughness:values.roughness/10,seed:values.seed,dashLength:values.dashLength,dashGap:values.dashGap,inkColor:values.fillColor,inkOpacity:values.fillOpacity});
}
export const srgbToLinear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export const linearToSrgb=x=>x<=.0031308?x*12.92:1.055*Math.max(0,x)**(1/2.4)-.055;
export const shaderColor=hex=>[1,3,5].map(i=>srgbToLinear(parseInt(hex.slice(i,i+2),16)/255));
export function shaderManifest(raw,width=512,height=512,time=0){
 const parameters=sanitizeShaderParameters(raw),size=512/Math.min(width,height);
 return {schema:SHADER_REFERENCE_SCHEMA,version:1,effect:'handdrawnFill',referenceVersion:1,
  target:{engine:'Unity',pipeline:'URP',referenceUnity:'6',referenceURP:'17',engineCompilation:'not-run'},
  parameters,styleNames:FILL_STYLES,
  parameterDefinitions:[{key:'style',type:'enum',options:FILL_STYLES.map((name,value)=>({name,value})),default:2},...SHADER_FIELDS.map(({key,min,max,default:value,step})=>({key,type:'number',min,max,step,default:value})),...['inkColor','paperColor'].map(key=>({key,type:'color',encoding:'sRGB hex',default:shaderDefaults()[key]}))],
  designSize:[width*size,height*size],previewTimeSeconds:time,
  input:{file:'mask.png',channel:'red',meaning:'linear coverage',sRGB:false,wrap:'Clamp',dimensions:[width,height]},
  output:{rgb:'straight linear',alpha:'coverage',blend:'SrcAlpha OneMinusSrcAlpha; alpha One OneMinusSrcAlpha'},
  units:{gap:'design pixels',width:'design pixels; dot radius in dots mode',angle:'degrees',scroll:'design pixels per second',designReferenceShortSide:512},
  colors:{encoding:'sRGB hex in parameters',inkLinear:shaderColor(parameters.inkColor),paperLinear:shaderColor(parameters.paperColor)},
  scope:['procedural fill clipped by mask','deterministic seed','time-driven scrolling'],
  excluded:['Rough.js contour reconstruction','node tree','keyframes','other post-processing'],
  sources:['handdrawn-fill.hlsl','HanddrawnFillURP.shader','reference-preview.vert.glsl','reference-preview.frag.glsl']};
}
// This fixed dialect mapping is only for our reviewed HLSL reference, not a general shader converter.
export function referenceGLSL(){
 return sources['handdrawn-fill.hlsl'].replace(/\bfloat([234])\b/g,(_,n)=>'vec'+n)
  .replace(/\blerp\b/g,'mix').replace(/\bfrac\b/g,'fract').replace(/\bfmod\b/g,'mod')
  .replace(/\bsaturate\(([^()]+)\)/g,'clamp($1,0.0,1.0)');
}
export const SHADER_VERTEX='#version 300 es\nout vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}';
export function shaderFragment(){return `#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform sampler2D maskTex;
uniform float style,gap,width,angle,roughness,seed,dashLength,dashGap,inkOpacity,paperOpacity,timeSeconds;
uniform vec2 scroll,designSize;uniform vec3 inkColor,paperColor;
${referenceGLSL()}
vec3 displaySRGB(vec3 rgb){return mix(rgb*12.92,1.055*pow(max(rgb,vec3(0)),vec3(1.0/2.4))-.055,step(vec3(.0031308),rgb));}
void main(){MFHanddrawnParams v;v.style=style;v.gap=gap;v.width=width;v.angle=angle;v.roughness=roughness;v.seed=seed;v.dashLength=dashLength;v.dashGap=dashGap;v.inkOpacity=inkOpacity;v.paperOpacity=paperOpacity;v.scroll=scroll;v.designSize=designSize;v.inkColor=inkColor;v.paperColor=paperColor;
frag=MFHanddrawnFill(uv,texture(maskTex,uv).r,timeSeconds,v);frag.rgb=displaySRGB(frag.rgb);}`;}
export function shaderReferencePackage({parameters,mask,preview,width,height,time=0,editorPreview=null,sourceEffect=null}){
 const manifest=shaderManifest(parameters,width,height,time),utf8=new TextEncoder(),text={...sources,
  'parameters.json':JSON.stringify(manifest,null,2)+'\n','reference-preview.vert.glsl':SHADER_VERTEX,'reference-preview.frag.glsl':shaderFragment()};
 if(sourceEffect){manifest.sourceEffect=sourceEffect;text['parameters.json']=JSON.stringify(manifest,null,2)+'\n';}
 if(!(mask instanceof Uint8Array)||!(preview instanceof Uint8Array)||mask.length<8||preview.length<8)throw messageError('shader.missingImages');
 return {manifest,bytes:encodeZIP([...Object.entries(text).map(([name,text])=>({name,data:utf8.encode(text)})),{name:'mask.png',data:mask},{name:'reference-preview.png',data:preview},...(editorPreview?[{name:'editor-preview.png',data:editorPreview}]:[])])};
}
