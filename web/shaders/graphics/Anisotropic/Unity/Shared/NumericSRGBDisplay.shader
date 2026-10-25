Shader "MomoTextureForge/Display/NumericSRGB" {
 Properties {_MainTex("Premultiplied numeric sRGB output",2D)="black"{}}
 SubShader {Tags{"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}
 Pass {Blend One OneMinusSrcAlpha ZWrite Off Cull Off
 HLSLPROGRAM
 #pragma target 3.5
 #pragma vertex Vert
 #pragma fragment Frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 Texture2D<float4> _MainTex;SamplerState sampler_MainTex;float4 _MainTex_ST;
 struct Input {float4 positionOS:POSITION;float2 uv:TEXCOORD0;};struct Output {float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;};
 Output Vert(Input i){Output o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz);o.uv=i.uv*_MainTex_ST.xy+_MainTex_ST.zw;return o;}
 float4 Frag(Output i):SV_Target{
  float4 c=_MainTex.Sample(sampler_MainTex,i.uv);
  #ifndef UNITY_COLORSPACE_GAMMA
   float3 rgb=c.a>.00001?c.rgb/c.a:float3(0,0,0);
   rgb=lerp(rgb/12.92,pow(max((rgb+.055)/1.055,0.),2.4),step(.04045,rgb));c.rgb=rgb*c.a;
  #endif
  return c;
 }
 ENDHLSL
 }}}
