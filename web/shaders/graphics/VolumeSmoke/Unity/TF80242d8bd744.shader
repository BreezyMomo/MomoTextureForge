Shader "MomoTextureForge/Generated/TF80242d8bd744" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 _MF_0_placement ("Graphic / placement", Vector) = (0.5,0.5,1,1)
_MF_0_pivotTurn ("Graphic / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_0_opacity ("Graphic / opacity", Float) = 1
_MF_1_placement ("VolumeSmoke / placement", Vector) = (0.5,0.5,1,1)
_MF_1_pivotTurn ("VolumeSmoke / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_1_opacity ("VolumeSmoke / opacity", Float) = 1
_MF_1_seed ("VolumeSmoke / seed", Range(0,99999)) = 237
_MF_1_speed ("VolumeSmoke / speed", Range(0.1,3)) = 1
_MF_1_scale ("VolumeSmoke / scale", Range(1,12)) = 4
_MF_1_radius ("VolumeSmoke / radius", Range(0.2,1)) = 0.8
_MF_1_density ("VolumeSmoke / density", Range(0.1,6)) = 2.5
_MF_1_turbulence ("VolumeSmoke / turbulence", Range(0,2)) = 1.1
_MF_1_lightDirection ("VolumeSmoke / lightDirection", Range(-3.14,3.14)) = 0.8
_MF_1_lightStrength ("VolumeSmoke / lightStrength", Range(0,3)) = 1
_MF_1_temperature ("VolumeSmoke / temperature", Range(0.1,2)) = 1
_MF_1_quality ("VolumeSmoke / quality", Range(24,96)) = 56
_MF_1_uv ("VolumeSmoke / uv", Vector) = (1,0,0,0)
_MF_1_uvTwist ("VolumeSmoke / uvTwist", Float) = 0
_MF_1_clock ("VolumeSmoke / clock", Vector) = (1,0,0,1)
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
float _MF_1_speed;
float _MF_1_scale;
float _MF_1_radius;
float _MF_1_density;
float _MF_1_turbulence;
float _MF_1_lightDirection;
float _MF_1_lightStrength;
float _MF_1_temperature;
float _MF_1_quality;
float4 _MF_1_uv;
float _MF_1_uvTwist;
float4 _MF_1_clock;
 CBUFFER_END
 #include "TF80242d8bd744.hlsl"
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