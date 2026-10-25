Shader "MomoTextureForge/Generated/TF51ab6c4d9dc4" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 _MF_0_placement ("Graphic / placement", Vector) = (0.5,0.5,1,1)
_MF_0_pivotTurn ("Graphic / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_0_opacity ("Graphic / opacity", Float) = 1
_MF_1_placement ("TurbulentFlame / placement", Vector) = (0.5,0.5,1,1)
_MF_1_pivotTurn ("TurbulentFlame / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_1_opacity ("TurbulentFlame / opacity", Float) = 1
_MF_1_seed ("TurbulentFlame / seed", Range(0,99999)) = 7872
_MF_1_width ("TurbulentFlame / width", Range(0.1,1)) = 0.5
_MF_1_flameHeight ("TurbulentFlame / flameHeight", Range(0.1,1)) = 0.8
_MF_1_disparity ("TurbulentFlame / disparity", Range(0,1)) = 0.7
_MF_1_taper ("TurbulentFlame / taper", Range(0,1)) = 0.55
_MF_1_baseY ("TurbulentFlame / baseY", Range(-0.2,0.5)) = 0.1
_MF_1_warp ("TurbulentFlame / warp", Range(0,1)) = 0.65
_MF_1_warpScale ("TurbulentFlame / warpScale", Range(1,12)) = 5.5
_MF_1_octaves ("TurbulentFlame / octaves", Range(1,8)) = 7
_MF_1_flicker ("TurbulentFlame / flicker", Range(0,1)) = 0.35
_MF_1_fillAmount ("TurbulentFlame / fillAmount", Range(0,1)) = 0.5
_MF_1_coreTemp ("TurbulentFlame / coreTemp", Range(0,1)) = 0.82
_MF_1_edgeTemp ("TurbulentFlame / edgeTemp", Range(0,0.7)) = 0.35
_MF_1_smokeMix ("TurbulentFlame / smokeMix", Range(0,1)) = 0.35
_MF_1_intensity ("TurbulentFlame / intensity", Range(0.5,4)) = 1.65
_MF_1_smokeDensity ("TurbulentFlame / smokeDensity", Range(0,1)) = 0.5
_MF_1_smokeRise ("TurbulentFlame / smokeRise", Range(0,1)) = 0.6
_MF_1_smokeSpread ("TurbulentFlame / smokeSpread", Range(0,1)) = 0.4
_MF_1_fogBase ("TurbulentFlame / fogBase", Range(0,1.5)) = 0.6
_MF_1_motionSpeed ("TurbulentFlame / motionSpeed", Range(0,3)) = 1
_MF_1_uv ("TurbulentFlame / uv", Vector) = (1,0,0,0)
_MF_1_uvTwist ("TurbulentFlame / uvTwist", Float) = 0
_MF_1_clock ("TurbulentFlame / clock", Vector) = (1,0,0,1)
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
float _MF_1_width;
float _MF_1_flameHeight;
float _MF_1_disparity;
float _MF_1_taper;
float _MF_1_baseY;
float _MF_1_warp;
float _MF_1_warpScale;
float _MF_1_octaves;
float _MF_1_flicker;
float _MF_1_fillAmount;
float _MF_1_coreTemp;
float _MF_1_edgeTemp;
float _MF_1_smokeMix;
float _MF_1_intensity;
float _MF_1_smokeDensity;
float _MF_1_smokeRise;
float _MF_1_smokeSpread;
float _MF_1_fogBase;
float _MF_1_motionSpeed;
float4 _MF_1_uv;
float _MF_1_uvTwist;
float4 _MF_1_clock;
 CBUFFER_END
 #include "TF51ab6c4d9dc4.hlsl"
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