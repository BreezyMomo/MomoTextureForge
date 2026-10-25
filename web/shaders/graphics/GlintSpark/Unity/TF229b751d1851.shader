Shader "MomoTextureForge/Generated/TF229b751d1851" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 _MF_0_placement ("Graphic / placement", Vector) = (0.5,0.5,1,1)
_MF_0_pivotTurn ("Graphic / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_0_opacity ("Graphic / opacity", Float) = 1
_MF_1_placement ("GlintSpark / placement", Vector) = (0.5,0.5,1,1)
_MF_1_pivotTurn ("GlintSpark / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_1_opacity ("GlintSpark / opacity", Float) = 1
_MF_1_armLength ("GlintSpark / armLength", Range(0.15,1.2)) = 0.85
_MF_1_pointedness ("GlintSpark / pointedness", Range(6,64)) = 26
_MF_1_centerSize ("GlintSpark / centerSize", Range(0.01,0.25)) = 0.05
_MF_1_armCount ("GlintSpark / armCount", Range(3,8)) = 4
_MF_1_flickerSpeed ("GlintSpark / flickerSpeed", Range(0,3)) = 1.2
_MF_1_uv ("GlintSpark / uv", Vector) = (1,0,0,0)
_MF_1_uvTwist ("GlintSpark / uvTwist", Float) = 0
_MF_1_clock ("GlintSpark / clock", Vector) = (1,0,0,1)
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
float _MF_1_armLength;
float _MF_1_pointedness;
float _MF_1_centerSize;
float _MF_1_armCount;
float _MF_1_flickerSpeed;
float4 _MF_1_uv;
float _MF_1_uvTwist;
float4 _MF_1_clock;
 CBUFFER_END
 #include "TF229b751d1851.hlsl"
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