Shader "Hidden/MomoTextureForge/Postprocess/gravitationalLens" {
 Properties { _MainTex("Input RGBA",2D)="white"{} _MF_HeightTex("Height",2D)="black"{} [Toggle] _MF_InputLinear("Input uses linear RGB",Float)=1 [Toggle] _MF_InputPremultiplied("Input is premultiplied",Float)=0 _MF_HeightMode("Height: 0 alpha, 1 luminance, 2 texture",Float)=0 [Toggle] _MF_UseExplicitTime("Use explicit seconds",Float)=0 _MF_Seconds("Explicit seconds",Float)=0
 _MF_lensingStrength("lensingStrength",Range(0,1))=0.3
_MF_magnification("magnification",Range(0.1,2))=0.84
_MF_centerX("centerX",Range(0,1))=0.5
_MF_centerY("centerY",Range(0,1))=0.5
 }
 SubShader { Tags {"RenderPipeline"="UniversalPipeline"} Pass {ZTest Always Cull Off ZWrite Off
 HLSLPROGRAM
#pragma target 3.5
#pragma vertex MF_Vert
#pragma fragment MF_Frag
#include "Effect.hlsl"
ENDHLSL
 }}}
