Shader "MomoTextureForge/Generated/TFd6f5e2c67c0f" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 _MF_0_placement ("Graphic / placement", Vector) = (0.5,0.5,1,1)
_MF_0_pivotTurn ("Graphic / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_0_opacity ("Graphic / opacity", Float) = 1
_MF_1_placement ("ConeGradient / placement", Vector) = (0.5,0.5,1,1)
_MF_1_pivotTurn ("ConeGradient / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_1_opacity ("ConeGradient / opacity", Float) = 1
_MF_1_startAngle ("ConeGradient / startAngle", Range(-360,360)) = 0
_MF_1_sweepAngle ("ConeGradient / sweepAngle", Range(1,360)) = 360
_MF_1_radialWarp ("ConeGradient / radialWarp", Range(-6.28,6.28)) = 0
_MF_1_gradientPower ("ConeGradient / gradientPower", Range(0.1,8)) = 1
_MF_1_reverse ("ConeGradient / reverse", Range(0,1)) = 0
_MF_1_uv ("ConeGradient / uv", Vector) = (1,0,0,0)
_MF_1_uvTwist ("ConeGradient / uvTwist", Float) = 0
_MF_1_clock ("ConeGradient / clock", Vector) = (1,0,0,1)
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
float _MF_1_startAngle;
float _MF_1_sweepAngle;
float _MF_1_radialWarp;
float _MF_1_gradientPower;
float _MF_1_reverse;
float4 _MF_1_uv;
float _MF_1_uvTwist;
float4 _MF_1_clock;
 CBUFFER_END
 #include "TFd6f5e2c67c0f.hlsl"
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