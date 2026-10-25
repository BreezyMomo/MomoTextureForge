Shader "MomoTextureForge/Generated/TFb0b41d95a91f" {
 Properties {
  [Toggle] _MF_UseExplicitTime ("Use explicit seconds", Float) = 0
  _MF_Seconds ("Explicit elapsed seconds", Float) = 0
 _MF_0_placement ("Graphic / placement", Vector) = (0.5,0.5,1,1)
_MF_0_pivotTurn ("Graphic / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_0_opacity ("Graphic / opacity", Float) = 1
_MF_1_placement ("BezierRibbon / placement", Vector) = (0.5,0.5,1,1)
_MF_1_pivotTurn ("BezierRibbon / pivotTurn", Vector) = (0.5,0.5,0,1)
_MF_1_opacity ("BezierRibbon / opacity", Float) = 1
_MF_1_startX ("BezierRibbon / startX", Range(-8,8)) = -0.8
_MF_1_startY ("BezierRibbon / startY", Range(-8,8)) = -0.3
_MF_1_controlPoint1X ("BezierRibbon / controlPoint1X", Range(-8,8)) = -0.4
_MF_1_controlPoint1Y ("BezierRibbon / controlPoint1Y", Range(-8,8)) = 0.8
_MF_1_controlPoint2X ("BezierRibbon / controlPoint2X", Range(-8,8)) = 0.4
_MF_1_controlPoint2Y ("BezierRibbon / controlPoint2Y", Range(-8,8)) = -0.8
_MF_1_endX ("BezierRibbon / endX", Range(-8,8)) = 0.8
_MF_1_endY ("BezierRibbon / endY", Range(-8,8)) = 0.3
_MF_1_startWidth ("BezierRibbon / startWidth", Range(0.002,0.4)) = 0.08
_MF_1_endWidth ("BezierRibbon / endWidth", Range(0,0.4)) = 0.015
_MF_1_ribbonFeather ("BezierRibbon / ribbonFeather", Range(0.001,0.1)) = 0.01
_MF_1_drawProgress ("BezierRibbon / drawProgress", Range(0,1)) = 1
_MF_1_capShape ("BezierRibbon / capShape", Range(0,1)) = 0
_MF_1_uv ("BezierRibbon / uv", Vector) = (1,0,0,0)
_MF_1_uvTwist ("BezierRibbon / uvTwist", Float) = 0
_MF_1_clock ("BezierRibbon / clock", Vector) = (1,0,0,1)
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
float _MF_1_startX;
float _MF_1_startY;
float _MF_1_controlPoint1X;
float _MF_1_controlPoint1Y;
float _MF_1_controlPoint2X;
float _MF_1_controlPoint2Y;
float _MF_1_endX;
float _MF_1_endY;
float _MF_1_startWidth;
float _MF_1_endWidth;
float _MF_1_ribbonFeather;
float _MF_1_drawProgress;
float _MF_1_capShape;
float4 _MF_1_uv;
float _MF_1_uvTwist;
float4 _MF_1_clock;
 CBUFFER_END
 #include "TFb0b41d95a91f.hlsl"
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