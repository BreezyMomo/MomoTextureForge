Shader "MomoTextureForge/Generated/TFb01dce7017ee" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 _MF_0_placement ("Graphic / placement", Vector) = (0.5,0.5,1,1)
_MF_0_pivotTurn ("Graphic / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_0_opacity ("Graphic / opacity", Float) = 1
_MF_1_placement ("EventHorizonBlackHole / placement", Vector) = (0.5,0.5,1,1)
_MF_1_pivotTurn ("EventHorizonBlackHole / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_1_opacity ("EventHorizonBlackHole / opacity", Float) = 1
_MF_1_seed ("EventHorizonBlackHole / seed", Range(0,9999)) = 2057
_MF_1_motionSpeed ("EventHorizonBlackHole / motionSpeed", Range(0,2)) = 2
_MF_1_viewAngle ("EventHorizonBlackHole / viewAngle", Range(5,38)) = 13.5
_MF_1_diskTilt ("EventHorizonBlackHole / diskTilt", Range(-40,40)) = 25
_MF_1_magnification ("EventHorizonBlackHole / magnification", Range(0.65,1.3)) = 0.7
_MF_1_diskInner ("EventHorizonBlackHole / diskInner", Range(1.7,4)) = 2.95
_MF_1_diskBrightness ("EventHorizonBlackHole / diskBrightness", Range(0.35,2.5)) = 2.5
_MF_1_diskHeat ("EventHorizonBlackHole / diskHeat", Range(-0.3,0.5)) = 0.38
_MF_1_filamentStrength ("EventHorizonBlackHole / filamentStrength", Range(0.4,2)) = 2
_MF_1_exposure ("EventHorizonBlackHole / exposure", Range(0.5,2)) = 2
_MF_1_centerX ("EventHorizonBlackHole / centerX", Range(0,1)) = 0.54
_MF_1_centerY ("EventHorizonBlackHole / centerY", Range(0,1)) = 0.53
_MF_1_uv ("EventHorizonBlackHole / uv", Vector) = (1,0,0,0)
_MF_1_uvTwist ("EventHorizonBlackHole / uvTwist", Float) = 0
_MF_1_clock ("EventHorizonBlackHole / clock", Vector) = (1,0,0,1)
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
float _MF_1_seed;
float _MF_1_motionSpeed;
float _MF_1_viewAngle;
float _MF_1_diskTilt;
float _MF_1_magnification;
float _MF_1_diskInner;
float _MF_1_diskBrightness;
float _MF_1_diskHeat;
float _MF_1_filamentStrength;
float _MF_1_exposure;
float _MF_1_centerX;
float _MF_1_centerY;
float4 _MF_1_uv;
float _MF_1_uvTwist;
float4 _MF_1_clock;
 CBUFFER_END
 #include "TFb01dce7017ee.hlsl"
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