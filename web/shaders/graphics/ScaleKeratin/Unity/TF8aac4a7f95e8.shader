Shader "MomoTextureForge/Generated/TF8aac4a7f95e8" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 _MF_0_placement ("Graphic / placement", Vector) = (0.5,0.5,1,1)
_MF_0_pivotTurn ("Graphic / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_0_opacity ("Graphic / opacity", Float) = 1
_MF_1_placement ("ScaleKeratin / placement", Vector) = (0.5,0.5,1,1)
_MF_1_pivotTurn ("ScaleKeratin / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_1_opacity ("ScaleKeratin / opacity", Float) = 1
_MF_1_count ("ScaleKeratin / count", Range(2,24)) = 9
_MF_1_sheen ("ScaleKeratin / sheen", Range(0,1)) = 0.55
_MF_1_strokeWidth ("ScaleKeratin / strokeWidth", Range(0.002,0.1)) = 0.016
_MF_1_rowOffset ("ScaleKeratin / rowOffset", Range(0,1)) = 0.5
_MF_1_uv ("ScaleKeratin / uv", Vector) = (1,0,0,0)
_MF_1_uvTwist ("ScaleKeratin / uvTwist", Float) = 0
_MF_1_clock ("ScaleKeratin / clock", Vector) = (1,0,0,1)
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
 float4 _MF_0_placement;
float4 _MF_0_pivotTurn;
float _MF_0_opacity;
float4 _MF_1_placement;
float4 _MF_1_pivotTurn;
float _MF_1_opacity;
float _MF_1_count;
float _MF_1_sheen;
float _MF_1_strokeWidth;
float _MF_1_rowOffset;
float4 _MF_1_uv;
float _MF_1_uvTwist;
float4 _MF_1_clock;
 CBUFFER_END
 #include "TF8aac4a7f95e8.hlsl"
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
}