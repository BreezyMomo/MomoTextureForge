import {compileProjectShader,REALTIME_SHADER_SCHEMA} from './project-shader-compiler.js';
import {TreeRenderer} from './tree-renderer.js';
import {encodeZIP,encodePNG} from './encoders.js';
import {encodeResourcePack} from './resource-pack.js';

const VERTEX=`#version 300 es\nout vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;
export function shaderSource(c){return `Shader "MomoTextureForge/Generated/${c.prefix}" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 ${c.properties.map(p=>`${p.name} (${JSON.stringify(p.label.replace(/[\r\n]/g,' ').slice(0,120))}, ${p.type==='Float'&&Number.isFinite(p.min)&&Number.isFinite(p.max)?`Range(${p.min},${p.max})`:p.type}) = ${p.type==='Vector'?'('+p.value.join(',')+')':p.value}`).join('\n')}
 }
 SubShader { Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
 Pass { Tags { "LightMode"="SRPDefaultUnlit" } Cull Off ZWrite Off Blend One OneMinusSrcAlpha
 HLSLPROGRAM
 #pragma target 3.5
 #pragma vertex MF_Vert
 #pragma fragment MF_Frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 CBUFFER_START(UnityPerMaterial)
 float _MF_UseExplicitTime, _MF_Seconds;
 ${c.uniformHLSL}
 CBUFFER_END
 #include "${c.prefix}.hlsl"
 struct MF_Attributes {float4 positionOS:POSITION;float2 uv:TEXCOORD0;};
 struct MF_Varyings {float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;};
 MF_Varyings MF_Vert(MF_Attributes v){MF_Varyings o;o.positionCS=TransformObjectToHClip(v.positionOS.xyz);o.uv=v.uv;return o;}
 float4 MF_Frag(MF_Varyings i):SV_Target {
  float4 result=MF_Evaluate(i.uv,_MF_UseExplicitTime>.5?_MF_Seconds:_Time.y);
  #ifndef UNITY_COLORSPACE_GAMMA
  float3 srgb=result.a>0.?result.rgb/result.a:0.;
  float3 linearColor=lerp(srgb/12.92,pow(max((srgb+.055)/1.055,0.),2.4),step(.04045,srgb));
  result.rgb=linearColor*result.a;
  #endif
  return result;
 }
 ENDHLSL
 }}
}`;}
export function importer(c){return `#if UNITY_EDITOR
using System;using System.IO;using UnityEditor;using UnityEngine;
namespace MomoTextureForge.Exported.${c.prefix} {
public static class MaterialImporter {
 [Serializable] class Value {public string name;public string type;public float floatValue;public Vector4 vectorValue;}
 [Serializable] class Manifest {public string schema;public string shaderName;public Value[] materialProperties;}
 [MenuItem("Assets/Momo Texture Forge/Import ${c.prefix} material")]
 public static void Import(){var path=EditorUtility.OpenFilePanel("Select parameters.json inside the exported Unity folder",Application.dataPath,"json");if(!String.IsNullOrEmpty(path))ImportFile(path);}
 public static Material ImportFile(string path){
  var pipeline=UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline;
  if(pipeline==null||pipeline.GetType().FullName!="UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset")throw new InvalidOperationException("Activate a URP pipeline asset before importing this material.");
  var full=Path.GetFullPath(path);var folder=Path.GetDirectoryName(full);var assets=Path.GetFullPath(Application.dataPath)+Path.DirectorySeparatorChar;
  if(!full.StartsWith(assets,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Copy the entire exported Unity folder inside Assets first.");
  var data=JsonUtility.FromJson<Manifest>(File.ReadAllText(full));
  if(data==null||data.schema!="${REALTIME_SHADER_SCHEMA}"||data.shaderName!="MomoTextureForge/Generated/${c.prefix}")throw new InvalidOperationException("Wrong shader manifest.");
  AssetDatabase.Refresh();var shader=Shader.Find(data.shaderName);if(shader==null||ShaderUtil.ShaderHasError(shader))throw new InvalidOperationException("Shader missing or has compilation errors. Check the Console and active URP pipeline.");
  var material=new Material(shader);foreach(var value in data.materialProperties){if(!material.HasProperty(value.name))throw new InvalidOperationException("Missing material property: "+value.name);if(value.type=="Vector")material.SetVector(value.name,value.vectorValue);else material.SetFloat(value.name,value.floatValue);}
  var output=AssetDatabase.GenerateUniqueAssetPath("Assets/"+Path.GetRelativePath(Application.dataPath,folder).Replace('\\\\','/')+"/${c.prefix}.mat");AssetDatabase.CreateAsset(material,output);AssetDatabase.SaveAssets();Selection.activeObject=material;return material;
 }
}}
#endif
`;}
const README=`# Realtime project shader / 实时作品 Shader

Copy the complete **Unity/** directory to a dedicated folder inside your project's **Assets/**. Keep the Shader, HLSL, parameters.json and Editor directory together. Target: Unity 2022.3 / URP 14, unlit transparent mesh UV0, Shader Model 3.5. Other Unity versions, UI stencil/Canvas and particle-specific streams require separate target validation.

将整个 **Unity/** 目录复制到目标项目 **Assets/** 下的独立目录。保持 Shader、HLSL、parameters.json 与 Editor 同目录结构。目标为 Unity 2022.3 / URP 14、透明无光照 Mesh、UV0；UI 遮罩与粒子专用顶点流需要额外适配。

Use **Assets → Momo Texture Forge → Import <package ID> material**, choose this package's Unity/parameters.json. The importer creates a new material; it never overwrites existing assets. Alternatively use the public ImportFile method in that package's unique C# namespace. Each package has a unique Shader path, file prefix and importer namespace. No runtime component, RenderTexture or texture input is required by this first analytic subset.

菜单 **Assets → Momo Texture Forge → Import <包编号> material** 选择 Unity/parameters.json，将创建新材质。也可调用包内独立 C# 命名空间的 ImportFile。首批解析子集无需运行组件、RenderTexture 或输入贴图。

The material reads continuous Unity _Time.y in seconds. Enable _MF_UseExplicitTime and set _MF_Seconds to compare exact reference times (for example 0.75). Export duration does not wrap time or guarantee a seamless loop. Formula speed/offset/frozen seconds are independent per node. Drive the mapped properties on a material instance or MaterialPropertyBlock. UV0 is 0–1 from bottom-left; design aspect is recorded in the manifest. Scale the mesh to the same aspect; arbitrary world mesh dimensions are not automatically inferred.

时间单位为持续秒数。启用 _MF_UseExplicitTime 并设置 _MF_Seconds 可逐帧对照；导出时长不是自动循环周期。使用实际映射的属性驱动材质实例或 MaterialPropertyBlock。UV0 由左下到右上为 0–1，网格比例需匹配 manifest 的设计比例。

The core evaluates and blends **premultiplied sRGB numeric RGB + coverage alpha** to preserve editor math. The URP wrapper converts the final straight color to linear in Linear projects, then premultiplies again. ShaderLab uses **Blend One OneMinusSrcAlpha**. Never multiply alpha twice. Palette properties are numeric sRGB Vectors, not ShaderLab Color properties: use SetVector, and do not pass Color.linear. Scalar formula coverage and a generator's native RGBA/luminance are different contracts, recorded per node.

核心以预乘的 sRGB 数值与覆盖 alpha 合成，以保留编辑器计算；URP 封装在 Linear 项目最终转换颜色再预乘。配色属性是 sRGB 数值 Vector，用 SetVector，不要再次取 linear 或重复乘 alpha。公式覆盖率与生成器原生 RGBA 分开处理。

reference-*.png are native editor straight RGBA reference frames with a transparent background. generated-*.png show the analytic preview. verification includes numeric difference on black and white backgrounds; this is browser evidence, not Unity compilation or target-engine visual acceptance. Small boundary differences can arise because the editor rasterizes intermediate nodes, whereas the exported subset evaluates analytic functions directly. Original graph/resources and reviewed source dependencies are retained for adaptation; unsupported capabilities are rejected before export and are never silently omitted.

reference-*.png 是原编辑器透明背景的直通 RGBA，generated-*.png 是生成解析程序的预览。差异报告不等同于 Unity 编译或真实播放验证。原生中间纹理采样和解析求值可能存在少量边界误差。不支持的节点与功能会在导出前明确阻止，不会悄悄跳过。
`;

export async function exportProjectShader(project,{nodeId=null,times=[0,.75,1.5,2.25,3],size=256,snapshotId=null,sourceRevision=null,sourceZIP=null,signal=null}={}){
 if(!Array.isArray(times)||!times.length||times.length>16||times.some(t=>!Number.isFinite(t)||t<0)||!Number.isInteger(size)||size<32||size>2048)throw Error('Invalid shader reference times or size');
 if(times.length*size*size>16777216)throw Error('Shader references exceed the pixel budget; reduce size or number of times');
 const c=await compileProjectShader(project,{nodeId}),entries=[],utf8=new TextEncoder(),text=(name,value)=>entries.push({name,data:utf8.encode(value)});
 const shader=shaderSource(c),hlsl='#ifndef '+c.prefix.toUpperCase()+'_INCLUDED\n#define '+c.prefix.toUpperCase()+'_INCLUDED\n// Generated only from this project and its reviewed source dependencies.\n'+c.hlsl+'\n#endif\n';
 text('Unity/'+c.prefix+'.shader',shader);text('Unity/'+c.prefix+'.hlsl',hlsl);text('Unity/Editor/'+c.prefix+'Importer.cs',importer(c));text('README.md',README);text('README.en.md',README);
 const archiveProject={...project,projectResources:[]},packed=await encodeResourcePack(archiveProject);entries.push({name:'source-project.zip',data:packed});
 text('sources/graph.json',JSON.stringify(archiveProject,null,2));
 for(const [id,a]of Object.entries(c.assets)){text('sources/'+id.replace(/[^A-Za-z0-9_-]/g,'_')+'.json',JSON.stringify(a,null,2));}
 const manifest={schema:REALTIME_SHADER_SCHEMA,version:1,compilerVersion:1,packageId:c.prefix,shaderName:'MomoTextureForge/Generated/'+c.prefix,source:{snapshotId,revision:sourceRevision,projectHash:c.sourceHash,archiveSHA256:await sha256(sourceZIP??packed),packagedArchiveSHA256:await sha256(packed),archiveScope:'canvas-without-graphic-list'},target:c.support.target,
  materialProperties:[{name:'_MF_UseExplicitTime',type:'Float',floatValue:0},{name:'_MF_Seconds',type:'Float',floatValue:times[0]},...c.properties.map(p=>({name:p.name,type:p.type,...(p.type==='Vector'?{vectorValue:Object.fromEntries(['x','y','z','w'].map((k,i)=>[k,p.value[i]]))}:{floatValue:p.value})}))],nodes:c.mapping,parameters:c.properties,
  inputTextures:[],output:{sourceMode:project.output.mode,sourceAlpha:project.output.alpha,sourceBackground:project.output.background,shaderMode:'color',shaderAlpha:'transparent coverage; canvas background excluded'},color:{core:'premultiplied numeric sRGB RGB + coverage alpha',wrapper:'final straight RGB converted to linear in Linear projects and premultiplied',blend:'One / OneMinusSrcAlpha',paletteEncoding:'sRGB Vector; use SetVector without Color.linear'},uv:{channel:0,origin:'bottom-left',range:[0,1],designAspect:project.canvas.ratio,designSize:[project.output.width,project.output.height]},time:{unit:'elapsed seconds',property:'_MF_Seconds',explicitToggle:'_MF_UseExplicitTime',automatic:'Unity _Time.y',references:times,exportDuration:project.output.exportSeconds,seamlessLoop:false},support:c.support,verification:{browserCompilation:'not-run',engineCompilation:'not-run',engineVisualReview:'not-run'},limitations:c.support.limitations};
 const native=new TreeRenderer(document.createElement('canvas')),canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl){native.destroy();throw Error('WebGL2 required for generated shader verification');}
 const w=project.canvas.ratio>=1?size:Math.max(1,Math.round(size*project.canvas.ratio)),h=project.canvas.ratio>=1?Math.max(1,Math.round(size/project.canvas.ratio)):size;canvas.width=w;canvas.height=h;
 let program;
 try{
  const compile=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(e);}return s;};
  const vs=compile(gl.VERTEX_SHADER,VERTEX),fragment='#version 300 es\nprecision highp float;precision highp int;in vec2 uv;out vec4 frag;uniform float MF_seconds;\n'+c.glslCore+'\nvoid main(){vec4 p=MF_Evaluate(uv,MF_seconds);frag=vec4(p.a>0.?p.rgb/p.a:vec3(0.),p.a);}',fs=compile(gl.FRAGMENT_SHADER,fragment);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);for(const p of c.properties){const loc=gl.getUniformLocation(program,p.name);if(p.type==='Vector')gl.uniform4fv(loc,p.value);else gl.uniform1f(loc,p.value);}
  const reference=structuredClone(project);reference.output.mode='color';reference.output.alpha=true;manifest.verification.browserCompilation='passed';manifest.verification.frames=[];
  for(const [i,seconds]of times.entries()){
   if(signal?.aborted)throw Error('Shader export canceled');
   await new Promise(resolve=>setTimeout(resolve,0));
   const pixels=native.draw(reference,w,h,{time:seconds/project.output.seconds,formulaSeconds:seconds,solo:nodeId,read:true});
   gl.uniform1f(gl.getUniformLocation(program,'MF_seconds'),seconds);gl.viewport(0,0,w,h);gl.drawArrays(gl.TRIANGLES,0,3);const raw=new Uint8Array(w*h*4),generated=new Float32Array(raw.length);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,raw);for(let y=0;y<h;y++)for(let x=0;x<w*4;x++)generated[y*w*4+x]=raw[(h-y-1)*w*4+x]/255;
   entries.push({name:'reference-'+String(i).padStart(2,'0')+'.png',data:await encodePNG(pixels,w,h)},{name:'generated-'+String(i).padStart(2,'0')+'.png',data:await encodePNG(generated,w,h)});
   const mae=background=>{let sum=0;for(let k=0;k<pixels.length;k+=4)for(let ch=0;ch<3;ch++)sum+=Math.abs(Math.min(1,Math.max(0,pixels[k+ch]))*pixels[k+3]+background*(1-pixels[k+3])-generated[k+ch]*generated[k+3]-background*(1-generated[k+3]));return sum/(w*h*3)*255;};
   manifest.verification.frames.push({seconds,width:w,height:h,blackRGBMAE255:mae(0),whiteRGBMAE255:mae(1)});
  }
 }finally{native.destroy();if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
 text('Unity/parameters.json',JSON.stringify(manifest,null,2)+'\n');text('support.json',JSON.stringify(c.support,null,2)+'\n');
 return {bytes:encodeZIP(entries),manifest};
}
async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
