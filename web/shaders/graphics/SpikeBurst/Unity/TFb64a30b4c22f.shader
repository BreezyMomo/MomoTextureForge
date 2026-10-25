Shader "MomoTextureForge/Generated/TFb64a30b4c22f" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 _MF_0_placement ("Graphic / placement", Vector) = (0.5,0.5,1,1)
_MF_0_pivotTurn ("Graphic / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_0_opacity ("Graphic / opacity", Float) = 1
_MF_1_placement ("SpikeBurst / placement", Vector) = (0.5,0.5,1,1)
_MF_1_pivotTurn ("SpikeBurst / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_1_opacity ("SpikeBurst / opacity", Float) = 1
_MF_1_count ("SpikeBurst / count", Range(3,32)) = 12
_MF_1_parameterLength ("SpikeBurst / parameterLength", Range(0.1,1.4)) = 0.8
_MF_1_lengthRandomness ("SpikeBurst / lengthRandomness", Range(0,1)) = 0.55
_MF_1_bottomWidth ("SpikeBurst / bottomWidth", Range(0.01,0.4)) = 0.07
_MF_1_feather ("SpikeBurst / feather", Range(0.001,0.1)) = 0
_MF_1_uv ("SpikeBurst / uv", Vector) = (1,0,0,0)
_MF_1_uvTwist ("SpikeBurst / uvTwist", Float) = 0
_MF_1_clock ("SpikeBurst / clock", Vector) = (1,0,0,1)
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
float _MF_1_parameterLength;
float _MF_1_lengthRandomness;
float _MF_1_bottomWidth;
float _MF_1_feather;
float4 _MF_1_uv;
float _MF_1_uvTwist;
float4 _MF_1_clock;
 CBUFFER_END
 #include "TFb64a30b4c22f.hlsl"
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