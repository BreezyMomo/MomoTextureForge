Shader "__DISPLAY_SHADER__" {
 Properties {
 [MainTexture] _InputTex("输入贴图 / Input texture",2D)="white"{}
 [Enum(NativeAlpha,0,NativeLuminance,1,LinearLuminance,2,InverseLinearLuminance,3,Red,4)] _MaskMode("轮廓来源 / Mask channel",Float)=0
 [Toggle] _PreserveAspect("保持贴图比例 / Preserve aspect",Float)=1
 [Toggle] _UseSourceColor("使用原图颜色 / Source color",Float)=0
 [HideInInspector] _AspectScale("Aspect scale",Vector)=(1,1,0,0)
 [HideInInspector] _SourceTex("Live source coverage",2D)="black"{}
 _Threshold("Contour threshold",Range(.01,.99))=.5
 _StrokeWidth("Outline width (design pixels)",Range(0,12))=1.8
 _StrokeRoughness("Outline roughness",Range(0,10))=1.3
 [Toggle] _DoubleStroke("Double outline",Float)=1
 _StrokeColor("Outline color",Color)=(.12549,.12549,.12549,1)
 _StrokeOpacity("Outline opacity",Range(0,1))=1
 _NodeOpacity("Overall opacity",Range(0,1))=1
 [Enum(Solid,0,IndividualHachure,1,OriginalInput,2,NoFill,3)] _Style("Live fill",Float)=1
 _Gap("Hatch gap",Range(1,100))=8
 _Width("Hatch width",Range(.1,40))=4.8
 _Angle("Hatch angle",Range(-180,180))=-41
 _FillRoughness("Pen roughness",Range(0,10))=1.3
 _FillBowing("Pen bowing",Range(0,20))=1
 _FillMaxOffset("Pen randomness",Range(0,20))=2
 [Toggle] _DoubleFill("Draw fill twice",Float)=1
 _Seed("Sketch seed",Float)=1
 _InkColor("Fill color",Color)=(.913725,.701961,.372549,1)
 _PaperColor("Paper color",Color)=(1,.969,.925,1)
 _InkOpacity("Fill opacity",Range(0,1))=1
 _PaperOpacity("Paper opacity",Range(0,1))=0
 _Scroll("Fill scroll",Vector)=(0,0,0,0)
 _DesignSize("Design size",Vector)=(512,512,0,0)
 [Enum(Effect,0,SourceAlpha,1,ContourFill,2,OutlineOnly,3)] _DebugMode("Display",Float)=0
 }
 SubShader {Tags {"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}
 Pass {Tags {"LightMode"="SRPDefaultUnlit"} Cull Off ZWrite Off
 Blend SrcAlpha OneMinusSrcAlpha, One OneMinusSrcAlpha
 HLSLPROGRAM
 #pragma target 4.5
 #pragma vertex Vert
 #pragma fragment Frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 #include "handdrawn-input.hlsl"
 #include "hatch-brush.hlsl"
 TEXTURE2D(_SourceTex);SAMPLER(sampler_SourceTex);
 CBUFFER_START(UnityPerMaterial)
 float4 _AspectScale,_SourceTex_TexelSize,_InkColor,_PaperColor,_StrokeColor,_Scroll,_DesignSize;
 float _UseSourceColor,_MaskMode,_PreserveAspect;
 float _Threshold,_StrokeWidth,_StrokeRoughness,_DoubleStroke,_StrokeOpacity,_NodeOpacity;
 float _Style,_Gap,_Width,_Angle,_Seed,_InkOpacity,_PaperOpacity,_Seconds,_DebugMode;
 float _FillRoughness,_FillBowing,_FillMaxOffset;
 CBUFFER_END
 struct A{float4 positionOS:POSITION;float2 uv:TEXCOORD0;};
 struct V{float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;};
 V Vert(A i){V o;o.positionCS=TransformObjectToHClip(float3(i.positionOS.xy*_AspectScale.xy,i.positionOS.z));o.uv=i.uv;return o;}
 float Coverage(float2 uv){
  if(any(uv<0)||any(uv>1))return 0;
  return SAMPLE_TEXTURE2D_LOD(_SourceTex,sampler_SourceTex,uv,0).r;
 }
 float SegmentSquared(float2 p,float2 a,float2 b){float2 v=b-a;float t=saturate(dot(p-a,v)/max(dot(v,v),1e-8));float2 d=p-a-t*v;return dot(d,d);}
 float ContourDistance(float2 uv,out float field){
  float2 gridSize=_DesignSize.xy*.5,grid=uv*gridSize-.5,cell=floor(grid),f=frac(grid);
  float c0=Coverage((cell+float2(.5,.5))/gridSize),c1=Coverage((cell+float2(1.5,.5))/gridSize);
  float c2=Coverage((cell+float2(1.5,1.5))/gridSize),c3=Coverage((cell+float2(.5,1.5))/gridSize);
  field=lerp(lerp(c0,c1,f.x),lerp(c3,c2,f.x),f.y);
  float nearest=400;
  [unroll]for(int y=-1;y<=1;y++)[unroll]for(int x=-1;x<=1;x++){
   float2 base=cell+float2(x,y);
   float2 points[4];points[0]=(base+.5)/gridSize;points[1]=(base+float2(1.5,.5))/gridSize;points[2]=(base+1.5)/gridSize;points[3]=(base+float2(.5,1.5))/gridSize;
   float values[4];values[0]=Coverage(points[0]);values[1]=Coverage(points[1]);values[2]=Coverage(points[2]);values[3]=Coverage(points[3]);
   float2 first=float2(0,0);int count=0;
   [unroll]for(int e=0;e<4;e++){int next=(e+1)%4;float va=values[e],vb=values[next];
    if((va>=_Threshold)!=(vb>=_Threshold)){
     float at=(_Threshold-va)/(vb-va);float2 crossing=lerp(points[e],points[next],at)*_DesignSize.xy;
     if(count%2==0)first=crossing;else nearest=min(nearest,SegmentSquared(uv*_DesignSize.xy,first,crossing));count++;
    }
   }
  }
  float distance=sqrt(nearest);return field>=_Threshold?distance:-distance;
 }
 float4 Frag(V i):SV_Target {
  if(_Style>.5&&_Style<1.5){if(_BrushReady<.5)return 0;if(_BrushDiagnostics[0]>(uint)_BrushSpanCapacity)return float4(1,0,1,1);}
  if(_BrushReady<.5)return 0;
  float2 uv=i.uv,px=(uv-.5)*_DesignSize.xy;
  // Reconstruct local marching-square contour segments from the live field.
  // Geometry is recalculated for every frame; no exported contour texture is sampled.
  float value;float distanceInside=ContourDistance(uv,value);
  float border=min(min(uv.x,1-uv.x)*_DesignSize.x,min(uv.y,1-uv.y)*_DesignSize.y);
  distanceInside=min(distanceInside,border);
  float aa=clamp(fwidth(distanceInside)*.55,.5,1.0);
  float fillMask=smoothstep(-aa,aa,distanceInside);
  float jitter=(sin(px.x*.18+px.y*.11+_Seed*.7)*.4+sin(px.x*.045-px.y*.087+_Seed)*.6)*_StrokeRoughness*.65;
  float stroke=0;
  if(_StrokeWidth>0){
   float width=_StrokeWidth*.5;
   stroke=1-smoothstep(width-aa*.65,width+aa*.65,abs(distanceInside+jitter));
   if(_DoubleStroke>.5){float j2=sin(px.x*.12-px.y*.09+_Seed*1.9)*_StrokeRoughness*.8;
    float second=1-smoothstep(width*.65-aa*.65,width*.65+aa*.65,abs(distanceInside-j2));stroke=1-(1-stroke)*(1-second*.7);}
  }
  if(_DebugMode>.5&&_DebugMode<1.5)return float4(value,value,value,1);
  if(_DebugMode>1.5&&_DebugMode<2.5)return float4(1,1,1,fillMask);
  float4 original=MF_InputLinear(MF_InputSample(uv));
  float3 inkColor=lerp(_InkColor.rgb,original.rgb,saturate(_UseSourceColor));
  float4 result=0;
  if(_DebugMode<2.5){
   if(_Style>1.5&&_Style<2.5)result=original;
   else if(_Style<1.5){
    float pen=_Style>.5?BrushHatch(uv,_DesignSize.xy,_Gap,-_Angle,_Width,_Scroll.xy,_Seconds):1;
    float ink=pen*_InkOpacity,paper=_PaperOpacity*(1-ink),a=saturate(ink+paper);
    result=float4((inkColor*ink+_PaperColor.rgb*paper)/max(a,1e-6),fillMask*a);
   }
  }
  result=MF_HanddrawnOver(result,_StrokeColor.rgb,stroke*_StrokeOpacity);
  result.a*=_NodeOpacity;return result;
 }
 ENDHLSL
 }}
}
