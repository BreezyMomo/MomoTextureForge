import {FX_GLSL} from './web/post-fx.js';
import {shaderHLSL} from './web/project-shader-compiler.js';
import {CREATIVE_FX_GLSL} from './web/creative-fx-glsl.js';
import {NOISE_WARP_GLSL} from './web/noise-warp.js';
import {CONTENT_FX_GLSL} from './web/content-effects.js';

// These are parameter bindings, not alternate effect algorithms. The actual kernel is shared with WebGL.
export const POST_BINDINGS={
 blur:{op:10,setup:'contourStep=_MF_BlurDirection*radius*pixel;',pipeline:'blur'},
 bloom:{op:12,setup:'fxThreshold=threshold;fxAmount=strength;contourStep=_MF_BlurDirection*radius*pixel;',pipeline:'bloom'},
 sharpen:{op:13,setup:'fxAmount=strength;'},
 chromatic:{op:14,setup:'contourStep=distance*pixel;fxData[0].x=direction;'},
 posterize:{op:15,setup:'if(darkSteps<=0.)return MF_texture(_MainTex,uv);fxAmount=darkSteps;fxThreshold=lightSteps;'},
 pixelate:{op:20,setup:'fxData[0].xy=size/(512.*fxMetric);'},
 vignette:{op:21,setup:'fxData[0]=float4(strength,range,0,0);fxData[1]=float4(top,bottom,left,right);fxColors[0]=color.rgb;'},
 scanline:{op:22,setup:'fxData[0]=float4(density,seconds*speed+phase,strength,0);fxColors[0]=color.rgb;'},
 kaleidoscope:{op:23,setup:'fxData[0].xy=float2(segments,rotation);'},
 mirror:{op:24,setup:'fxData[0].xy=float2(mirrorX,mirrorY);'},
 gravitationalLens:{op:46,setup:'if(lensingStrength<=0.)return MF_texture(_MainTex,uv);fxData[0]=float4(lensingStrength,magnification,centerX,centerY);'},
 swirl:{op:25,setup:'fxData[0].xy=float2(strength,radius);'},
 edge:{op:26,setup:'contourStep=width*pixel;fxAmount=strength;fxColors[0]=color.rgb;'},
 tricolor:{op:27,setup:'fxColors[0]=shadow.rgb;fxColors[1]=midtone.rgb;fxColors[2]=highlight.rgb;'},
 radialMask:{op:28,setup:'fxData[0]=float4(centerX,centerY,radius,feather);fxData[1].x=invert;'},
 unblack:{op:29,setup:'fxAmount=strength;'},
 normal:{op:30,setup:'contourStep=sampleStep*pixel;fxAmount=strength/sampleStep;fxData[0].x=flipY;'}
};

export function postprocessKernel(){
 let source=FX_GLSL.replace(CREATIVE_FX_GLSL,'').replace(NOISE_WARP_GLSL,'').replace(CONTENT_FX_GLSL,'')
 .replace('if(operation>=32&&operation<=41)applyCreativeFx(c,h);','').replace('if(operation==42)applyNoiseWarp(c,h);','').replace('if(operation>=43&&operation<=45)applyContentFx(c,h);','');
 // Explicit rotation retains GLSL column order without relying on HLSL matrix constructors.
 source=source.replace('v=mat2(cos(a),-sin(a),sin(a),cos(a))*v;','v=vec2(cos(a)*v.x+sin(a)*v.y,-sin(a)*v.x+cos(a)*v.y);')
 .replaceAll('uniform ','static ').replaceAll('textureSize(srcColor,0)','_MainTex_TexelSize.zw').replaceAll('texture(','MF_texture(');
 return shaderHLSL(source).replaceAll('filtered(','MF_texture(');
}
const property=p=>'_MF_'+p.key;
const value=p=>p.type==='boolean'?+p.default:p.type==='color'?'('+[1,3,5].map(i=>parseInt(p.default.slice(i,i+2),16)/255).join(',')+',1)':p.default;
export function postprocessShader(spec,binding){
 const declarations=spec.parameters.map(p=>(p.type==='color'?'float4':'float')+' '+property(p)+';').join('\n');
 const setup=binding.setup.replace(/\b[A-Za-z_]\w*\b/g,word=>spec.parameters.some(p=>p.key===word)?'_MF_'+word:word);
 const aliases=spec.parameters.map(p=>'#define '+p.key+' '+property(p)).join('\n');
 const kernel=postprocessKernel();
 return `Shader "Hidden/MomoTextureForge/Postprocess/${spec.id}" {
 Properties { _MainTex("Input RGBA",2D)="white"{} _MF_HeightTex("Height",2D)="black"{} [Toggle] _MF_InputLinear("Input uses linear RGB",Float)=1 [Toggle] _MF_InputPremultiplied("Input is premultiplied",Float)=0 _MF_HeightMode("Height: 0 alpha, 1 luminance, 2 texture",Float)=0 [Toggle] _MF_UseExplicitTime("Use explicit seconds",Float)=0 _MF_Seconds("Explicit seconds",Float)=0
 ${spec.parameters.map(p=>`${property(p)}("${p.key}",${p.type==='color'?'Vector':`Range(${p.min??0},${p.max??1})`})=${value(p)}`).join('\n')}
 }
 SubShader { Tags {"RenderPipeline"="UniversalPipeline"} Pass {ZTest Always Cull Off ZWrite Off
 HLSLPROGRAM
 #pragma target 3.5
 #pragma vertex MF_Vert
 #pragma fragment MF_Frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 Texture2D<float4> _MainTex,_MF_OriginalTex,_MF_HeightTex;SamplerState sampler_MainTex;
 float4 _MainTex_TexelSize;
 ${declarations}
 float _MF_Seconds,_MF_UseExplicitTime,_MF_InputLinear,_MF_InputPremultiplied,_MF_HeightMode,_MF_InternalInput;
 float2 _MF_BlurDirection;int _MF_Operation;
 static float2 uv,contourStep;static int repeatNode=0;
 #define operation ${binding.pipeline?'_MF_Operation':binding.op}
 #define srcColor _MainTex
 #define dstColor _MF_OriginalTex
 #define srcHeight _MF_HeightTex
 #define dstHeight _MF_HeightTex
 #define tableTex _MainTex
 #define mod(x,y) ((x)-(y)*floor((x)/(y)))
 float3 MF_toSRGB(float3 c){return lerp(c*12.92,1.055*pow(max(c,0.),1./2.4)-.055,step(.0031308,c));}
 float4 MF_external(Texture2D<float4> tex,float2 p){float4 c=tex.SampleLevel(sampler_MainTex,p,0);if(_MF_InputPremultiplied>.5)c.rgb=c.a>.00001?c.rgb/c.a:float3(0,0,0);if(_MF_InputLinear>.5)c.rgb=MF_toSRGB(c.rgb);c.rgb*=c.a;return c;}
 float4 MF_texture(Texture2D<float4> tex,float2 p){return _MF_InternalInput>.5?tex.SampleLevel(sampler_MainTex,p,0):MF_external(tex,p);}
 float MF_height(float2 p){if(_MF_HeightMode>1.5)return _MF_HeightTex.SampleLevel(sampler_MainTex,p,0).r;float4 c=MF_texture(_MainTex,p);return _MF_HeightMode>.5?dot(c.rgb,float3(.2126,.7152,.0722)):c.a;}
 ${kernel.replace(/MF_texture\((?:srcHeight|dstHeight),(\w+)\)\.r/g,'MF_height($1)').replaceAll('MF_texture(dstColor,uv)','MF_external(_MF_OriginalTex,uv)')}
 struct MF_In {float4 positionOS:POSITION;float2 uv:TEXCOORD0;};struct MF_Out {float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;};
 MF_Out MF_Vert(MF_In i){MF_Out o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz);o.uv=i.uv;return o;}
 float4 MF_Frag(MF_Out i):SV_Target {uv=i.uv;float seconds=_MF_UseExplicitTime>.5?_MF_Seconds:_Time.y;float2 dimensions=_MainTex_TexelSize.zw;float2 pixel=min(dimensions.x,dimensions.y)/512.*_MainTex_TexelSize.xy;
 fxBounds=float4(0,0,1,1);fxMetric=dimensions/min(dimensions.x,dimensions.y);fxAmount=0;fxThreshold=0;contourStep=float2(0,0);
 fxData[0]=fxData[1]=fxData[2]=float4(0,0,0,0);fxColors[0]=fxColors[1]=fxColors[2]=float3(0,0,0);
 ${setup}
 float4 c;float h;applyFx(c,h);return c;}
 ENDHLSL
 }}}
 `;
}

export function postprocessComponent(spec,binding){
 const className='Momo'+spec.id[0].toUpperCase()+spec.id.slice(1);
 const fields=spec.parameters.map(p=>p.type==='color'?`public Vector4 ${p.key}=new Vector4(${[1,3,5].map(i=>parseInt(p.default.slice(i,i+2),16)/255+'f').join(',')},1f);`:p.type==='boolean'?`public bool ${p.key}=${p.default?'true':'false'};`:`[Range(${p.min}f,${p.max}f)] public float ${p.key}=${p.default}f;`).join('\n');
 return {name:className+'.cs',text:`using UnityEngine;
 namespace MomoTextureForge.Modules {
 [ExecuteAlways] public sealed class ${className}:MomoPostprocess {
 ${fields}
 protected override string ShaderName=>"Hidden/MomoTextureForge/Postprocess/${spec.id}";
 protected override int Operation=>${binding.op};
 protected override int Pipeline=>${binding.pipeline==='blur'?1:binding.pipeline==='bloom'?2:0};
 protected override void Configure(Material material){${spec.parameters.map(p=>p.type==='color'?`material.SetVector("${property(p)}",${p.key});`:`material.SetFloat("${property(p)}",${p.type==='boolean'?p.key+'?1f:0f':p.key});`).join('\n')}}
 }}\n`};
}
