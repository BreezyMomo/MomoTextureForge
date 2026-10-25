Shader "Hidden/MomoTextureForge/GraphicResolve" {
 Properties {_MainTex("Graphic samples",2D)="black"{} _MF_Samples("Samples per axis",Float)=2 _MF_SourceLinear("Source is linear",Float)=1}
 SubShader {Tags{"RenderPipeline"="UniversalPipeline"} Pass {ZTest Always Cull Off ZWrite Off
 HLSLPROGRAM
 #pragma target 3.5
 #pragma vertex Vert
 #pragma fragment Frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 Texture2D<float4> _MainTex;SamplerState sampler_MainTex;
 float4 _MainTex_TexelSize;float _MF_Samples,_MF_SourceLinear;
 struct Input {float4 positionOS:POSITION;float2 uv:TEXCOORD0;};struct Output {float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;};
 Output Vert(Input i){Output o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz);o.uv=i.uv;return o;}
 float4 Frag(Output i):SV_Target{
  int count=(int)clamp(_MF_Samples,1.,4.);float4 sum=0.;
  for(int y=0;y<4;y++)for(int x=0;x<4;x++){if(x>=count||y>=count)continue;
   float2 uv=i.uv+(float2(x,y)+.5-float(count)*.5)*abs(_MainTex_TexelSize.xy);
   float4 c=_MainTex.SampleLevel(sampler_MainTex,uv,0);
   if(_MF_SourceLinear>.5){float3 rgb=c.a>.00001?c.rgb/c.a:float3(0,0,0);rgb=lerp(rgb*12.92,1.055*pow(max(rgb,0.),1./2.4)-.055,step(.0031308,rgb));c.rgb=rgb*c.a;}
   sum+=c;
  }
  return sum/float(count*count);
 }
 ENDHLSL
 }}}
