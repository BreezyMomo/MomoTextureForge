Shader "__COVERAGE_SHADER__" {
 Properties {_InputTex("RGBA input",2D)="white"{} _MaskMode("Native contour source / extended channel",Float)=0}
 SubShader { Tags {"RenderPipeline"="UniversalPipeline"} Pass { ZTest Always Cull Off ZWrite Off
 HLSLPROGRAM
 #pragma target 4.5
 #pragma vertex vert_img
 #pragma fragment Frag
 #include "UnityCG.cginc"
 #include "handdrawn-input.hlsl"
 float _MaskMode;
 float4 Frag(v2f_img i):SV_Target {
  float4 input=MF_InputSample(i.uv),workingLinear=MF_InputLinear(input);float value=input.a;
  // Native 0/1 retain web semantics. Indices 2–4 are explicit Unity extensions.
  if(_MaskMode>.5&&_MaskMode<1.5)value=dot(MF_InputNativeRGB(input),float3(.2126,.7152,.0722));
  else if(_MaskMode>1.5&&_MaskMode<2.5)value=dot(workingLinear.rgb,float3(.2126,.7152,.0722))*workingLinear.a;
  else if(_MaskMode>2.5&&_MaskMode<3.5)value=(1-dot(workingLinear.rgb,float3(.2126,.7152,.0722)))*workingLinear.a;
  else if(_MaskMode>3.5)value=workingLinear.r*workingLinear.a;
  return saturate(value);
 }
 ENDHLSL
 }}
}
