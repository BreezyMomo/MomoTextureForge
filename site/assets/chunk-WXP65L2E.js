import{a as ie,d as oe}from"./chunk-4BJTUP6H.js";import{$b as L,Da as C,Ea as M,Yb as N,_b as T,aa as $,ac as R,bc as D,cc as te,da as J,dc as re,ec as ne,ga as Q,gc as ae,ja as ee,la as k,s as Z,va as H,x as K}from"./chunk-CUP23X3A.js";function U(t){if(t.kind!=="image"||t.mime==="image/svg+xml")return!1;let o=t.imageProcessing,s=t.imageTransform,l=t.imageColor;return!!(o&&(o.mode!=="none"||o.autoCenter||o.contour?.enabled)||s&&(s.scale!==1||s.rotation!==0)||l&&l.mode!=="none")}var ce=t=>{let o="";for(let s=0;s<t.length;s+=8192)o+=String.fromCharCode(...t.subarray(s,s+8192));return btoa(o)};async function se(t){if(t.kind!=="image"||t.mime==="image/svg+xml")return t;let o=U(t);if(!o&&!t.imageProcessing&&!t.imageTransform&&!t.imageColor)return t;let s=structuredClone(t);if(o){let l,e,a,f,c=[];try{l=await J(t);let g=new OffscreenCanvas(l.width,l.height);if(e=g.getContext("webgl2",{alpha:!0,premultipliedAlpha:!1,antialias:!1,preserveDrawingBuffer:!0}),!e)throw Error("保存处理结果需要WebGL2，请开启图形加速");if(Math.max(l.width,l.height)>e.getParameter(e.MAX_TEXTURE_SIZE))throw Error("图片尺寸超过显卡限制");let d=(i,n)=>{let p=e.createShader(i);if(c.push(p),e.shaderSource(p,n),e.compileShader(p),!e.getShaderParameter(p,e.COMPILE_STATUS))throw Error("图片结果编译失败："+e.getShaderInfoLog(p));return p};if(a=e.createProgram(),e.attachShader(a,d(e.VERTEX_SHADER,`#version 300 es
out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0,1);}`)),e.attachShader(a,d(e.FRAGMENT_SHADER,`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D assetImage;
`+Q(t.imageProcessing,t.imageTransform,t.imageColor)+`
void main(){color=sampleAssetImage(uv);if(color.a<=0.)color.rgb=vec3(0);}`)),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))throw Error("图片结果链接失败："+e.getProgramInfoLog(a));e.useProgram(a),f=e.createTexture(),e.bindTexture(e.TEXTURE_2D,f),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,l);for(let i of[e.TEXTURE_WRAP_S,e.TEXTURE_WRAP_T])e.texParameteri(e.TEXTURE_2D,i,e.CLAMP_TO_EDGE);if(e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.uniform1i(e.getUniformLocation(a,"assetImage"),0),e.viewport(0,0,g.width,g.height),e.drawArrays(e.TRIANGLES,0,3),e.getError()||e.isContextLost())throw Error("图片结果生成失败，请重试");let r=await g.convertToBlob({type:"image/png"});if(e.isContextLost())throw Error("图片结果生成时图形上下文丢失");let u=new Uint8Array(await r.arrayBuffer());if(u.length>16*1024*1024)throw Error("处理后的PNG超过16MB，请先缩小图片再保存");s.mime="image/png",s.data=ce(u)}finally{if(l?.close(),e){f&&e.deleteTexture(f),a&&e.deleteProgram(a);for(let g of c)e.deleteShader(g);e.getExtension("WEBGL_lose_context")?.loseContext()}}}return delete s.imageProcessing,delete s.imageTransform,delete s.imageColor,s}var P=64*1024*1024;function F(t){if(typeof t!="string"||t.length>200||!t||/^[\\/]|[:\\\x00-\x1f]/.test(t)||t.split("/").some(o=>!o||o==="."||o===".."))throw Error("非法资源路径："+t);return t}async function z(t){let o=new Uint8Array(t);if(o.length>P)throw Error("资源包超过64MB");let s=new DataView(o.buffer,o.byteOffset,o.byteLength),l=n=>s.getUint16(n,!0),e=n=>s.getUint32(n,!0),a=-1;for(let n=o.length-22;n>=Math.max(0,o.length-65557);n--)if(e(n)===101010256&&n+22+l(n+20)===o.length){a=n;break}if(a<0)throw Error("ZIP目录缺失");let f=l(a+10),c=e(a+16),g=e(a+12);if(l(a+4)||l(a+6)||l(a+8)!==f||f>4096||c+g!==a)throw Error("不支持多卷/ZIP64或目录过大");let d=c,r=0,u=new Map,i=new TextDecoder("utf-8",{fatal:!0});for(let n=0;n<f;n++){if(d+46>a||e(d)!==33639248)throw Error("ZIP目录损坏");let p=l(d+8),m=l(d+10),S=e(d+16),v=e(d+20),h=e(d+24),y=l(d+28),_=l(d+30),W=l(d+32),x=e(d+42);if(d+46+y+_+W>a||p&1||![0,8].includes(m)||l(d+34))throw Error("不支持加密或此ZIP压缩格式");let w=i.decode(o.subarray(d+46,d+46+y));if(d+=46+y+_+W,w.endsWith("/")&&h===0){F(w.slice(0,-1));continue}if(F(w),u.has(w))throw Error("ZIP包含重复路径："+w);if(r+=h,r>P||h>16*1024*1024)throw Error("解压资源超过大小限制");if(x+30>c||e(x)!==67324752||l(x+8)!==m)throw Error("ZIP文件头损坏");let B=x+30+l(x+26)+l(x+28);if(B+v>c||i.decode(o.subarray(x+30,x+30+l(x+26)))!==w)throw Error("ZIP路径或边界不一致");let I=o.slice(B,B+v);if(m===8){let j=new Blob([I]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader(),q=[],O=0;try{for(;;){let{done:A,value:X}=await j.read();if(A)break;if(O+=X.length,O>h)throw Error("解压长度超过声明");q.push(X)}}finally{await j.cancel()}I=new Uint8Array(O);let Y=0;for(let A of q)I.set(A,Y),Y+=A.length}if(I.length!==h||ie(I)!==S)throw Error("ZIP资源校验失败："+w);u.set(w,I)}if(d!==a)throw Error("ZIP目录长度不一致");return u}import fe from"./engine-shaders-3e2d56f9a67a5180.js";var le={"HatchBrush.compute":`// Rough lineIndex construction adapted from Rough.js renderer._line (MIT, Preet Shihn).\r
// See ROUGH-LICENSE.txt. Scan the live scalar field; no offline stroke image.\r
#pragma kernel BuildHatch\r
#pragma kernel ClearDiagnostics\r
Texture2D<float> _Coverage;\r
SamplerState sampler_linear_clamp;\r
RWStructuredBuffer<float4> _BrushData;\r
RWStructuredBuffer<uint> _BrushCounts;\r
RWStructuredBuffer<uint> _BrushDiagnostics;\r
int _LineCount,_FirstRow,_SpanCapacity;\r
float2 _DesignSize;\r
float _Gap,_Angle,_Threshold,_Roughness,_MaxOffset,_Bowing,_Seed,_PenWidth;\r
uint Next(inout uint state){state^=state<<13;state^=state>>17;state^=state<<5;return state;}\r
float Random(inout uint state){return (Next(state)&0x00ffffff)/16777216.;}\r
float Signed(inout uint state){return Random(state)*2.-1.;}\r
float CoverageAt(float x,float y){\r
 float angle=_Angle*.017453292519943295,c=cos(angle),s=sin(angle);\r
 float2 p=float2(c*x-s*y,s*x+c*y);float2 uv=p/_DesignSize+.5;\r
 if(any(uv<0)||any(uv>1))return 0;\r
 return _Coverage.SampleLevel(sampler_linear_clamp,uv,0);\r
}\r
void Emit(uint row,uint run,float start,float end,float y){\r
 if(run>=_SpanCapacity)return;\r
 float length=end-start;\r
 float gain=length<200?1: length>500?.4:(-0.0016668)*length+1.233334;\r
 float offset=min(_MaxOffset,length/10.);\r
 [unroll]for(uint penPass=0;penPass<2;penPass++){\r
  uint rng=(uint)(_Seed+1)*747796405u+(row+1)*2891336453u+(run+1)*277803737u+(penPass+1)*1597334677u;rng=max(rng,1u);\r
  float diverge=.2+Random(rng)*.2;\r
  float midY=Signed(rng)*(_Bowing*_MaxOffset*(start-end)/200.)*_Roughness*gain;\r
  float amount=offset*_Roughness*gain*(penPass==0?1:.5);\r
  float4 xs=float4(start+Signed(rng)*amount,start+length*diverge+Signed(rng)*amount,start+2*length*diverge+Signed(rng)*amount,end+Signed(rng)*amount);\r
  float4 ys=float4(y+Signed(rng)*amount,y+midY+Signed(rng)*amount,y+midY+Signed(rng)*amount,y+Signed(rng)*amount);\r
  uint index=((row*_SpanCapacity+run)*2+penPass)*3;\r
  _BrushData[index]=xs;_BrushData[index+1]=ys;\r
  _BrushData[index+2]=float4(min(min(xs.x,xs.y),min(xs.z,xs.w))-_PenWidth,max(max(xs.x,xs.y),max(xs.z,xs.w))+_PenWidth,min(min(ys.x,ys.y),min(ys.z,ys.w))-_PenWidth,max(max(ys.x,ys.y),max(ys.z,ys.w))+_PenWidth);\r
 }\r
}\r
[numthreads(32,1,1)]\r
void BuildHatch(uint3 id:SV_DispatchThreadID){\r
 uint lineIndex=id.x;if(lineIndex>=_LineCount)return;\r
 float y=(_FirstRow+(int)lineIndex)*max(_Gap,1.);\r
 float extent=length(_DesignSize)*.5+4.;\r
 int steps=(int)ceil(extent);float stepSize=2*extent/steps;\r
 float previous=CoverageAt(-extent,y);bool inside=previous>=_Threshold;float start=-extent;uint count=0;\r
 [loop]for(int i=1;i<=steps;i++){\r
  float x=-extent+i*stepSize;float value=CoverageAt(x,y);bool now=value>=_Threshold;\r
  if(now!=inside){float at=x-stepSize+stepSize*saturate((_Threshold-previous)/(value-previous));\r
   if(now)start=at;else{if(at-start>.25){Emit(lineIndex,count,start,at,y);count++;}}\r
  }\r
  inside=now;previous=value;\r
 }\r
 if(inside){Emit(lineIndex,count,start,extent,y);count++;}\r
 _BrushCounts[lineIndex]=count;\r
 InterlockedMax(_BrushDiagnostics[0],count);\r
}\r
\r
[numthreads(1,1,1)]\r
void ClearDiagnostics(uint3 id:SV_DispatchThreadID){_BrushDiagnostics[0]=0;}\r
`,"hatch-brush.hlsl":`// Each fill segment has its own pair of cubic pen strokes, generated on the GPU.\r
// Rough.js-inspired line mechanics; not its exact polygon simplification or random stream.\r
StructuredBuffer<float4> _BrushData;\r
StructuredBuffer<uint> _BrushCounts;\r
StructuredBuffer<uint> _BrushDiagnostics;\r
float _BrushReady,_BrushFirstRow,_BrushLineCount,_BrushSpanCapacity,_DoubleFill,_BrushRowRadius;\r
float Cubic(float4 p,float t){float s=1-t;return s*s*s*p.x+3*s*s*t*p.y+3*s*t*t*p.z+t*t*t*p.w;}\r
float CubicDerivative(float4 p,float t){float s=1-t;return 3*s*s*(p.y-p.x)+6*s*t*(p.z-p.y)+3*t*t*(p.w-p.z);}\r
float PenCoverage(float2 p,uint index,float width,float aa){\r
 float4 xs=_BrushData[index],ys=_BrushData[index+1],bounds=_BrushData[index+2];\r
 if(p.x<bounds.x||p.x>bounds.y||p.y<bounds.z||p.y>bounds.w)return 0;\r
 float t=saturate((p.x-xs.x)/max(xs.w-xs.x,.01));\r
 [unroll]for(int j=0;j<3;j++){float dx=CubicDerivative(xs,t);t=saturate(t-(Cubic(xs,t)-p.x)/max(dx,.01));}\r
 float2 curve=float2(Cubic(xs,t),Cubic(ys,t));\r
 float2 tangent=float2(CubicDerivative(xs,t),CubicDerivative(ys,t));\r
 float distance=abs(p.y-curve.y)/sqrt(1+pow(tangent.y/max(tangent.x,.01),2));\r
 if(t<.00001||t>.99999)distance=length(p-curve);\r
 return 1-smoothstep(width*.5-aa,width*.5+aa,distance);\r
}\r
float BrushHatch(float2 uv,float2 designSize,float gap,float angle,float width,float2 scroll,float seconds){\r
 float2 p=(uv-.5)*designSize+scroll*seconds;\r
 float rad=angle*.017453292519943295;float2 q=float2(cos(rad)*p.x+sin(rad)*p.y,-sin(rad)*p.x+cos(rad)*p.y);\r
 float aa=max((length(ddx(q))+length(ddy(q)))*.3,.35);\r
 int nearest=(int)floor(q.y/max(gap,1.)+.5);float ink=0;\r
 [loop]for(int k=-(int)_BrushRowRadius;k<=(int)_BrushRowRadius;k++){\r
  int row=nearest+k-(int)_BrushFirstRow;if(row<0||row>=(int)_BrushLineCount)continue;\r
  uint count=min(_BrushCounts[row],(uint)_BrushSpanCapacity);\r
  [loop]for(uint run=0;run<count;run++){\r
   uint index=((row*(uint)_BrushSpanCapacity+run)*2)*3;\r
   float a=PenCoverage(q,index,width,aa);\r
   if(_DoubleFill>.5)a=1-(1-a)*(1-PenCoverage(q,index+3,width,aa));\r
   ink=1-(1-ink)*(1-a);\r
  }\r
 }\r
 return ink;\r
}\r
`,"handdrawn-input.hlsl":`// Shared RGBA input adaptation. Native web working RGB is premultiplied numeric sRGB.\r
Texture2D<float4> _InputTex;\r
SamplerState sampler_InputTex;\r
float4 _InputTex_ST;\r
float _InputPremultiplied,_InputEncoding;\r
float3 MF_ToSRGB(float3 x){return lerp(x*12.92,1.055*pow(max(x,0.),1./2.4)-.055,step(.0031308,x));}\r
float3 MF_ToLinear(float3 x){return lerp(x/12.92,pow(max((x+.055)/1.055,0.),2.4),step(.04045,x));}\r
float4 MF_InputSample(float2 uv){uv=uv*_InputTex_ST.xy+_InputTex_ST.zw;if(any(uv<0)||any(uv>1))return 0;return _InputTex.SampleLevel(sampler_InputTex,uv,0);}\r
float3 MF_InputStraight(float4 c){return _InputPremultiplied>.5?(c.a>1e-6?c.rgb/c.a:float3(0,0,0)):c.rgb;}\r
float3 MF_InputNativeRGB(float4 c){float3 rgb=MF_InputStraight(c);\r
#ifndef UNITY_COLORSPACE_GAMMA\r
 if(_InputEncoding<.5)rgb=MF_ToSRGB(rgb);\r
#endif\r
 return rgb*saturate(c.a);\r
}\r
float4 MF_InputLinear(float4 c){float3 rgb=MF_InputStraight(c);\r
#ifndef UNITY_COLORSPACE_GAMMA\r
 if(_InputEncoding>.5)rgb=MF_ToLinear(rgb);\r
#endif\r
 return float4(rgb,saturate(c.a));\r
}\r
float4 MF_HanddrawnOver(float4 base,float3 rgb,float opacity){float a=saturate(opacity),outA=a+base.a*(1-a);return float4((rgb*a+base.rgb*base.a*(1-a))/max(outA,1e-6),outA);}\r
`,"InputCoverage.shader":`Shader "__COVERAGE_SHADER__" {\r
 Properties {_InputTex("RGBA input",2D)="white"{} _MaskMode("Native contour source / extended channel",Float)=0}\r
 SubShader { Tags {"RenderPipeline"="UniversalPipeline"} Pass { ZTest Always Cull Off ZWrite Off\r
 HLSLPROGRAM\r
 #pragma target 4.5\r
 #pragma vertex vert_img\r
 #pragma fragment Frag\r
 #include "UnityCG.cginc"\r
 #include "handdrawn-input.hlsl"\r
 float _MaskMode;\r
 float4 Frag(v2f_img i):SV_Target {\r
  float4 input=MF_InputSample(i.uv),workingLinear=MF_InputLinear(input);float value=input.a;\r
  // Native 0/1 retain web semantics. Indices 2–4 are explicit Unity extensions.\r
  if(_MaskMode>.5&&_MaskMode<1.5)value=dot(MF_InputNativeRGB(input),float3(.2126,.7152,.0722));\r
  else if(_MaskMode>1.5&&_MaskMode<2.5)value=dot(workingLinear.rgb,float3(.2126,.7152,.0722))*workingLinear.a;\r
  else if(_MaskMode>2.5&&_MaskMode<3.5)value=(1-dot(workingLinear.rgb,float3(.2126,.7152,.0722)))*workingLinear.a;\r
  else if(_MaskMode>3.5)value=workingLinear.r*workingLinear.a;\r
  return saturate(value);\r
 }\r
 ENDHLSL\r
 }}\r
}\r
`,"Handdrawn.shader":`Shader "__DISPLAY_SHADER__" {\r
 Properties {\r
 [MainTexture] _InputTex("输入贴图 / Input texture",2D)="white"{}\r
 [Enum(NativeAlpha,0,NativeLuminance,1,LinearLuminance,2,InverseLinearLuminance,3,Red,4)] _MaskMode("轮廓来源 / Mask channel",Float)=0\r
 [Toggle] _PreserveAspect("保持贴图比例 / Preserve aspect",Float)=1\r
 [Toggle] _UseSourceColor("使用原图颜色 / Source color",Float)=0\r
 [HideInInspector] _AspectScale("Aspect scale",Vector)=(1,1,0,0)\r
 [HideInInspector] _SourceTex("Live source coverage",2D)="black"{}\r
 _Threshold("Contour threshold",Range(.01,.99))=.5\r
 _StrokeWidth("Outline width (design pixels)",Range(0,12))=1.8\r
 _StrokeRoughness("Outline roughness",Range(0,10))=1.3\r
 [Toggle] _DoubleStroke("Double outline",Float)=1\r
 _StrokeColor("Outline color",Color)=(.12549,.12549,.12549,1)\r
 _StrokeOpacity("Outline opacity",Range(0,1))=1\r
 _NodeOpacity("Overall opacity",Range(0,1))=1\r
 [Enum(Solid,0,IndividualHachure,1,OriginalInput,2,NoFill,3)] _Style("Live fill",Float)=1\r
 _Gap("Hatch gap",Range(1,100))=8\r
 _Width("Hatch width",Range(.1,40))=4.8\r
 _Angle("Hatch angle",Range(-180,180))=-41\r
 _FillRoughness("Pen roughness",Range(0,10))=1.3\r
 _FillBowing("Pen bowing",Range(0,20))=1\r
 _FillMaxOffset("Pen randomness",Range(0,20))=2\r
 [Toggle] _DoubleFill("Draw fill twice",Float)=1\r
 _Seed("Sketch seed",Float)=1\r
 _InkColor("Fill color",Color)=(.913725,.701961,.372549,1)\r
 _PaperColor("Paper color",Color)=(1,.969,.925,1)\r
 _InkOpacity("Fill opacity",Range(0,1))=1\r
 _PaperOpacity("Paper opacity",Range(0,1))=0\r
 _Scroll("Fill scroll",Vector)=(0,0,0,0)\r
 _DesignSize("Design size",Vector)=(512,512,0,0)\r
 [Enum(Effect,0,SourceAlpha,1,ContourFill,2,OutlineOnly,3)] _DebugMode("Display",Float)=0\r
 }\r
 SubShader {Tags {"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"}\r
 Pass {Tags {"LightMode"="SRPDefaultUnlit"} Cull Off ZWrite Off\r
 Blend SrcAlpha OneMinusSrcAlpha, One OneMinusSrcAlpha\r
 HLSLPROGRAM\r
 #pragma target 4.5\r
 #pragma vertex Vert\r
 #pragma fragment Frag\r
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"\r
 #include "handdrawn-input.hlsl"\r
 #include "hatch-brush.hlsl"\r
 TEXTURE2D(_SourceTex);SAMPLER(sampler_SourceTex);\r
 CBUFFER_START(UnityPerMaterial)\r
 float4 _AspectScale,_SourceTex_TexelSize,_InkColor,_PaperColor,_StrokeColor,_Scroll,_DesignSize;\r
 float _UseSourceColor,_MaskMode,_PreserveAspect;\r
 float _Threshold,_StrokeWidth,_StrokeRoughness,_DoubleStroke,_StrokeOpacity,_NodeOpacity;\r
 float _Style,_Gap,_Width,_Angle,_Seed,_InkOpacity,_PaperOpacity,_Seconds,_DebugMode;\r
 float _FillRoughness,_FillBowing,_FillMaxOffset;\r
 CBUFFER_END\r
 struct A{float4 positionOS:POSITION;float2 uv:TEXCOORD0;};\r
 struct V{float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;};\r
 V Vert(A i){V o;o.positionCS=TransformObjectToHClip(float3(i.positionOS.xy*_AspectScale.xy,i.positionOS.z));o.uv=i.uv;return o;}\r
 float Coverage(float2 uv){\r
  if(any(uv<0)||any(uv>1))return 0;\r
  return SAMPLE_TEXTURE2D_LOD(_SourceTex,sampler_SourceTex,uv,0).r;\r
 }\r
 float SegmentSquared(float2 p,float2 a,float2 b){float2 v=b-a;float t=saturate(dot(p-a,v)/max(dot(v,v),1e-8));float2 d=p-a-t*v;return dot(d,d);}\r
 float ContourDistance(float2 uv,out float field){\r
  float2 gridSize=_DesignSize.xy*.5,grid=uv*gridSize-.5,cell=floor(grid),f=frac(grid);\r
  float c0=Coverage((cell+float2(.5,.5))/gridSize),c1=Coverage((cell+float2(1.5,.5))/gridSize);\r
  float c2=Coverage((cell+float2(1.5,1.5))/gridSize),c3=Coverage((cell+float2(.5,1.5))/gridSize);\r
  field=lerp(lerp(c0,c1,f.x),lerp(c3,c2,f.x),f.y);\r
  float nearest=400;\r
  [unroll]for(int y=-1;y<=1;y++)[unroll]for(int x=-1;x<=1;x++){\r
   float2 base=cell+float2(x,y);\r
   float2 points[4];points[0]=(base+.5)/gridSize;points[1]=(base+float2(1.5,.5))/gridSize;points[2]=(base+1.5)/gridSize;points[3]=(base+float2(.5,1.5))/gridSize;\r
   float values[4];values[0]=Coverage(points[0]);values[1]=Coverage(points[1]);values[2]=Coverage(points[2]);values[3]=Coverage(points[3]);\r
   float2 first=float2(0,0);int count=0;\r
   [unroll]for(int e=0;e<4;e++){int next=(e+1)%4;float va=values[e],vb=values[next];\r
    if((va>=_Threshold)!=(vb>=_Threshold)){\r
     float at=(_Threshold-va)/(vb-va);float2 crossing=lerp(points[e],points[next],at)*_DesignSize.xy;\r
     if(count%2==0)first=crossing;else nearest=min(nearest,SegmentSquared(uv*_DesignSize.xy,first,crossing));count++;\r
    }\r
   }\r
  }\r
  float distance=sqrt(nearest);return field>=_Threshold?distance:-distance;\r
 }\r
 float4 Frag(V i):SV_Target {\r
  if(_Style>.5&&_Style<1.5){if(_BrushReady<.5)return 0;if(_BrushDiagnostics[0]>(uint)_BrushSpanCapacity)return float4(1,0,1,1);}\r
  if(_BrushReady<.5)return 0;\r
  float2 uv=i.uv,px=(uv-.5)*_DesignSize.xy;\r
  // Reconstruct local marching-square contour segments from the live field.\r
  // Geometry is recalculated for every frame; no exported contour texture is sampled.\r
  float value;float distanceInside=ContourDistance(uv,value);\r
  float border=min(min(uv.x,1-uv.x)*_DesignSize.x,min(uv.y,1-uv.y)*_DesignSize.y);\r
  distanceInside=min(distanceInside,border);\r
  float aa=clamp(fwidth(distanceInside)*.55,.5,1.0);\r
  float fillMask=smoothstep(-aa,aa,distanceInside);\r
  float jitter=(sin(px.x*.18+px.y*.11+_Seed*.7)*.4+sin(px.x*.045-px.y*.087+_Seed)*.6)*_StrokeRoughness*.65;\r
  float stroke=0;\r
  if(_StrokeWidth>0){\r
   float width=_StrokeWidth*.5;\r
   stroke=1-smoothstep(width-aa*.65,width+aa*.65,abs(distanceInside+jitter));\r
   if(_DoubleStroke>.5){float j2=sin(px.x*.12-px.y*.09+_Seed*1.9)*_StrokeRoughness*.8;\r
    float second=1-smoothstep(width*.65-aa*.65,width*.65+aa*.65,abs(distanceInside-j2));stroke=1-(1-stroke)*(1-second*.7);}\r
  }\r
  if(_DebugMode>.5&&_DebugMode<1.5)return float4(value,value,value,1);\r
  if(_DebugMode>1.5&&_DebugMode<2.5)return float4(1,1,1,fillMask);\r
  float4 original=MF_InputLinear(MF_InputSample(uv));\r
  float3 inkColor=lerp(_InkColor.rgb,original.rgb,saturate(_UseSourceColor));\r
  float4 result=0;\r
  if(_DebugMode<2.5){\r
   if(_Style>1.5&&_Style<2.5)result=original;\r
   else if(_Style<1.5){\r
    float pen=_Style>.5?BrushHatch(uv,_DesignSize.xy,_Gap,-_Angle,_Width,_Scroll.xy,_Seconds):1;\r
    float ink=pen*_InkOpacity,paper=_PaperOpacity*(1-ink),a=saturate(ink+paper);\r
    result=float4((inkColor*ink+_PaperColor.rgb*paper)/max(a,1e-6),fillMask*a);\r
   }\r
  }\r
  result=MF_HanddrawnOver(result,_StrokeColor.rgb,stroke*_StrokeOpacity);\r
  result.a*=_NodeOpacity;return result;\r
 }\r
 ENDHLSL\r
 }}\r
}\r
`,"HanddrawnEffect.cs":`using System;\r
using UnityEngine;\r
using UnityEngine.Rendering;\r
namespace __NAMESPACE__ {\r
 [ExecuteAlways,RequireComponent(typeof(MeshRenderer))]\r
 public sealed class HanddrawnEffect:MonoBehaviour {\r
  [Tooltip("在此材质的 Input texture 中指定贴图并调整手绘参数。")]\r
  public Material displayTemplate;\r
  public Material inputGenerator;\r
  public bool animate=true;\r
  public enum SourceAlphaMode{Straight=0,Premultiplied=1}\r
  public enum SourceColorSpace{UnitySampled=0,NativeSRGB=1}\r
  public SourceAlphaMode sourceAlphaMode;\r
  public SourceColorSpace sourceColorSpace;\r
  [HideInInspector] public string[] producerFloatProperties=new string[0],producerVectorProperties=new string[0];\r
  public bool useFixedDesignSize;\r
  public Vector2 fixedDesignSize=new Vector2(512,512);\r
  [HideInInspector] public Texture initialInputTexture;\r
  [HideInInspector] public int initialInputWidth,initialInputHeight;\r
  [HideInInspector] public Vector2 capturedDesignSize;\r
  public Vector2 generatorDesignSize=new Vector2(512,512);\r
  [HideInInspector] public Shader coverageShader;\r
  [HideInInspector] public ComputeShader hatchBuilder;\r
  [Range(32,1024)] public int resolution=512;\r
  [Range(1,128)] public int spanCapacity=32;\r
  [Tooltip("RenderTexture 默认每帧更新。其他动态贴图可开启此项；静态图片按变化缓存。")]\r
  public bool refreshEveryFrame;\r
  [Range(32,2048)] public int designShortSide=512;\r
  [Min(0)] public float explicitSeconds;\r
  public string Status{get;private set;}="Not rendered";\r
  public int LastMaxSpans{get;private set;}\r
  public int BrushLineCount=>rows;\r
  public long AllocatedBytes=>coverage?(long)coverage.width*coverage.height*4:0;\r
  public long BrushBufferBytes=>brush!=null?(long)brush.count*brush.stride+counts.count*4L+4:0;\r
  public RenderTexture Source=>coverage;\r
  public float LastRenderedSeconds{get;private set;}\r
  public int BuildCount{get;private set;}\r
  int lastHash;\r
  static readonly string[] Floats={"_MaskMode","_PreserveAspect","_UseSourceColor","_Threshold","_StrokeWidth","_StrokeRoughness","_DoubleStroke","_StrokeOpacity","_NodeOpacity","_Style","_Gap","_Width","_Angle","_FillRoughness","_FillBowing","_FillMaxOffset","_DoubleFill","_Seed","_InkOpacity","_PaperOpacity","_DebugMode"};\r
  static readonly string[] Vectors={"_InkColor","_PaperColor","_StrokeColor","_Scroll"};\r
  Texture DeclaredInput=>displayTemplate&&displayTemplate.HasProperty("_InputTex")?displayTemplate.GetTexture("_InputTex"):null;\r
  public Texture InputTexture=>inputGenerator?producerTexture:DeclaredInput;\r
  public long ProducerBytes=>producerTexture?(long)producerTexture.width*producerTexture.height*8:0;\r
  Material producer;RenderTexture producerTexture;\r
  int InputHash(){unchecked{int h=17;\r
   h=h*31+(displayTemplate?displayTemplate.GetInstanceID():0);\r
   h=h*31+(coverageShader?coverageShader.GetInstanceID():0);h=h*31+(hatchBuilder?hatchBuilder.GetInstanceID():0);\r
   h=h*31+resolution;h=h*31+spanCapacity;h=h*31+designShortSide;h=h*31+fixedDesignSize.GetHashCode();h=h*31+(useFixedDesignSize?1:0);h=h*31+capturedDesignSize.GetHashCode();h=h*31+generatorDesignSize.GetHashCode();h=h*31+(int)sourceAlphaMode;h=h*31+(int)sourceColorSpace;h=h*31+(inputGenerator?inputGenerator.GetInstanceID():0);if(inputGenerator){foreach(var p in producerFloatProperties)h=h*31+inputGenerator.GetFloat(p).GetHashCode();foreach(var p in producerVectorProperties)h=h*31+inputGenerator.GetVector(p).GetHashCode();}h=h*31+explicitSeconds.GetHashCode();\r
   if(displayTemplate&&displayTemplate.shader.name=="__DISPLAY_SHADER__"){foreach(var p in Floats)h=h*31+displayTemplate.GetFloat(p).GetHashCode();foreach(var p in Vectors)h=h*31+displayTemplate.GetVector(p).GetHashCode();h=h*31+displayTemplate.GetTextureScale("_InputTex").GetHashCode();h=h*31+displayTemplate.GetTextureOffset("_InputTex").GetHashCode();}\r
   var input=InputTexture;if(input){h=h*31+input.GetInstanceID();h=h*31+(int)input.updateCount;h=h*31+input.width;h=h*31+input.height;}return h;\r
  }}\r
  [ContextMenu("刷新手绘 / Refresh")] public void Refresh(){dirty=true;if(isActiveAndEnabled)RenderAt(explicitSeconds);}\r
  Material generator;ComputeShader builder,builderSource;RenderTexture coverage;\r
  ComputeBuffer brush,counts,diagnostics;int rows,firstRow,capacity,epoch;bool hooked,dirty=true,diagnosticPending;\r
  MeshRenderer target;Material previous;MaterialPropertyBlock properties,previousProperties;\r
  void OnEnable(){dirty=true;\r
#if UNITY_EDITOR\r
   UnityEditor.EditorApplication.update+=EditorTick;\r
#endif\r
  }\r
#if UNITY_EDITOR\r
  void EditorTick(){if(Application.isPlaying||!isActiveAndEnabled)return;int count=BuildCount;Update();if(count!=BuildCount){UnityEditor.EditorApplication.QueuePlayerLoopUpdate();UnityEditor.SceneView.RepaintAll();}}\r
#endif\r
  void OnValidate(){dirty=true;}\r
  void Update(){\r
   if(inputGenerator&&Application.isPlaying&&animate)RenderAt(Time.timeSinceLevelLoad);else if(dirty||InputHash()!=lastHash||refreshEveryFrame||!inputGenerator&&InputTexture is RenderTexture)RenderAt(explicitSeconds);\r
  }\r
  public bool RenderAt(float seconds){\r
   try{\r
    if(float.IsNaN(seconds)||float.IsInfinity(seconds))throw new InvalidOperationException("Time must be finite seconds");\r
    if(!displayTemplate||!coverageShader||!hatchBuilder)throw new InvalidOperationException("Missing handdrawn material, coverage shader or compute reference");\r
    if(displayTemplate.shader.name!="__DISPLAY_SHADER__")throw new InvalidOperationException("Use the Texture Handdrawn shader on the material");\r
    if((int)sourceAlphaMode<0||(int)sourceAlphaMode>1||(int)sourceColorSpace<0||(int)sourceColorSpace>1)throw new InvalidOperationException("Unknown RGBA input encoding");\r
    if(inputGenerator)RenderProducer(seconds);else ReleaseProducer();\r
    var input=InputTexture;if(!input||input==Texture2D.whiteTexture)throw new InvalidOperationException("Assign an input texture to the handdrawn material");\r
    if(input==coverage)throw new InvalidOperationException("Input cannot be this effect's generated coverage texture");\r
    if(input.dimension!=TextureDimension.Tex2D)throw new InvalidOperationException("Input must be a 2D texture or 2D RenderTexture");\r
    if(input is RenderTexture inputRT&&(!inputRT.IsCreated()||inputRT.antiAliasing!=1))throw new InvalidOperationException("Input RenderTexture must be created, resolved and single-sampled");\r
    foreach(var p in Floats){float v=displayTemplate.GetFloat(p);if(float.IsNaN(v)||float.IsInfinity(v))throw new InvalidOperationException("Material value must be finite: "+p);}\r
    foreach(var p in Vectors){var v=displayTemplate.GetVector(p);for(int j=0;j<4;j++)if(float.IsNaN(v[j])||float.IsInfinity(v[j]))throw new InvalidOperationException("Material vector must be finite: "+p);}\r
    var scale=displayTemplate.GetTextureScale("_InputTex");var offsetUV=displayTemplate.GetTextureOffset("_InputTex");\r
    if(!Finite(scale.x)||!Finite(scale.y)||!Finite(offsetUV.x)||!Finite(offsetUV.y))throw new InvalidOperationException("Texture scale/offset must be finite");\r
    float mode=displayTemplate.GetFloat("_MaskMode");if(mode<0||mode>4||mode!=Mathf.Floor(mode))throw new InvalidOperationException("Unknown mask channel");\r
    if(displayTemplate.GetFloat("_Threshold")<=0||displayTemplate.GetFloat("_Threshold")>=1)throw new InvalidOperationException("Contour threshold must be strictly between 0 and 1");\r
    if(displayTemplate.GetFloat("_FillRoughness")<0||displayTemplate.GetFloat("_FillMaxOffset")<0||displayTemplate.GetFloat("_Width")<=0||displayTemplate.GetFloat("_Gap")<1)throw new InvalidOperationException("Invalid pen width/gap/roughness/randomness");\r
    if(!SystemInfo.supportsComputeShaders||SystemInfo.graphicsShaderLevel<45||!SystemInfo.SupportsRenderTextureFormat(RenderTextureFormat.RFloat))throw new InvalidOperationException("Compute, SM4.5 and RFloat are required");\r
    if(!coverageShader.isSupported||!displayTemplate.shader.isSupported)throw new InvalidOperationException("A required shader is unsupported");\r
    float style=displayTemplate.GetFloat("_Style");if(style<0||style>3||style!=Mathf.Floor(style))throw new InvalidOperationException("Unsupported handdrawn fill; use the declared native mapping");\r
    float imageAspect=(float)input.width/input.height;\r
    int pixels=Mathf.Clamp(designShortSide,32,2048);\r
    bool captured=inputGenerator||input==initialInputTexture&&input.width==initialInputWidth&&input.height==initialInputHeight;var fixedSize=useFixedDesignSize?fixedDesignSize:captured?capturedDesignSize:Vector2.zero;\r
    var design=fixedSize.x>0&&fixedSize.y>0?new Vector4(fixedSize.x,fixedSize.y,0,0):imageAspect>=1?new Vector4(pixels*imageAspect,pixels,0,0):new Vector4(pixels,pixels/imageAspect,0,0);if(!Finite(design.x)||!Finite(design.y)||design.x<=0||design.y<=0||design.x>16384||design.y>16384)throw new InvalidOperationException("Invalid design size");\r
    if(!generator||generator.shader!=coverageShader){Dispose(generator);generator=new Material(coverageShader){hideFlags=HideFlags.HideAndDontSave};}\r
    if(!builder||builderSource!=hatchBuilder){Dispose(builder);builder=Instantiate(hatchBuilder);builderSource=hatchBuilder;builder.hideFlags=HideFlags.HideAndDontSave;}\r
    if(!hooked){target=GetComponent<MeshRenderer>();previous=target.sharedMaterial;previousProperties=new MaterialPropertyBlock();target.GetPropertyBlock(previousProperties);properties=new MaterialPropertyBlock();hooked=true;}\r
    int longest=Mathf.Clamp(resolution,32,1024);float aspect=design.x/design.y;\r
    int width=aspect>=1?longest:Mathf.Max(1,Mathf.RoundToInt(longest*aspect)),height=aspect>=1?Mathf.Max(1,Mathf.RoundToInt(longest/aspect)):longest;\r
    if(!coverage||coverage.width!=width||coverage.height!=height){ReleaseTexture();coverage=new RenderTexture(width,height,0,RenderTextureFormat.RFloat,RenderTextureReadWrite.Linear){name="Texture Forge live coverage",hideFlags=HideFlags.HideAndDontSave,wrapMode=TextureWrapMode.Clamp,filterMode=FilterMode.Bilinear,useMipMap=false,autoGenerateMips=false};if(!coverage.Create())throw new InvalidOperationException("Coverage allocation failed");}\r
    generator.SetTexture("_InputTex",input);generator.SetTextureScale("_InputTex",scale);generator.SetTextureOffset("_InputTex",offsetUV);generator.SetFloat("_MaskMode",mode);generator.SetFloat("_InputPremultiplied",inputGenerator?0:(float)sourceAlphaMode);generator.SetFloat("_InputEncoding",inputGenerator?0:(float)sourceColorSpace);\r
    var active=RenderTexture.active;bool srgb=GL.sRGBWrite;\r
    try{GL.sRGBWrite=false;Graphics.Blit(null,coverage,generator,0);}finally{RenderTexture.active=active;GL.sRGBWrite=srgb;}\r
    float gap=Mathf.Max(1,displayTemplate.GetFloat("_Gap"));int half=Mathf.CeilToInt(new Vector2(design.x,design.y).magnitude*.5f/gap)+3,lineCount=half*2+1;\r
    int requestedCapacity=Mathf.Clamp(spanCapacity,1,128);long bytes=(long)lineCount*requestedCapacity*2*3*16+lineCount*4L+4;\r
    if(lineCount>4096||bytes>67108864)throw new InvalidOperationException("Live pen allocation exceeds 4096 rows or 64 MiB; increase gap or reduce capacity/design size");\r
    float rough=displayTemplate.GetFloat("_FillRoughness"),offset=displayTemplate.GetFloat("_FillMaxOffset"),bow=displayTemplate.GetFloat("_FillBowing"),penWidth=displayTemplate.GetFloat("_Width");\r
    int radius=Mathf.CeilToInt((penWidth*.5f+offset*rough+Mathf.Abs(bow)*offset*new Vector2(design.x,design.y).magnitude/200*rough+2)/gap)+1;\r
    if(radius>128)throw new InvalidOperationException("Pen search radius exceeds 128 rows; reduce roughness/bowing/randomness/width or increase gap");\r
    if(brush==null||rows!=lineCount||capacity!=requestedCapacity){ReleaseBrush();rows=lineCount;capacity=requestedCapacity;firstRow=-half;brush=new ComputeBuffer(rows*capacity*2*3,16);counts=new ComputeBuffer(rows,4);diagnostics=new ComputeBuffer(1,4);}\r
    int kernel=builder.FindKernel("BuildHatch"),clear=builder.FindKernel("ClearDiagnostics");builder.SetBuffer(clear,"_BrushDiagnostics",diagnostics);builder.Dispatch(clear,1,1,1);\r
    builder.SetTexture(kernel,"_Coverage",coverage);builder.SetBuffer(kernel,"_BrushData",brush);builder.SetBuffer(kernel,"_BrushCounts",counts);builder.SetBuffer(kernel,"_BrushDiagnostics",diagnostics);\r
    builder.SetInt("_LineCount",rows);builder.SetInt("_FirstRow",firstRow);builder.SetInt("_SpanCapacity",capacity);builder.SetVector("_DesignSize",design);builder.SetFloat("_Gap",gap);builder.SetFloat("_Angle",-displayTemplate.GetFloat("_Angle"));builder.SetFloat("_Threshold",displayTemplate.GetFloat("_Threshold"));\r
    builder.SetFloat("_Roughness",rough);builder.SetFloat("_MaxOffset",offset);builder.SetFloat("_Bowing",bow);builder.SetFloat("_Seed",displayTemplate.GetFloat("_Seed"));builder.SetFloat("_PenWidth",Mathf.Max(penWidth,2));builder.Dispatch(kernel,(rows+31)/32,1,1);\r
    target.sharedMaterial=displayTemplate;target.GetPropertyBlock(properties);properties.SetTexture("_SourceTex",coverage);properties.SetVector("_DesignSize",design);\r
    properties.SetVector("_AspectScale",displayTemplate.GetFloat("_PreserveAspect")>.5f?new Vector4(design.x/Mathf.Max(design.x,design.y),design.y/Mathf.Max(design.x,design.y),0,0):new Vector4(1,1,0,0));properties.SetTexture("_InputTex",input);properties.SetFloat("_InputPremultiplied",inputGenerator?0:(float)sourceAlphaMode);properties.SetFloat("_InputEncoding",inputGenerator?0:(float)sourceColorSpace);properties.SetFloat("_Seconds",Mathf.Max(0,seconds));properties.SetFloat("_BrushReady",1);properties.SetBuffer("_BrushData",brush);properties.SetBuffer("_BrushCounts",counts);properties.SetBuffer("_BrushDiagnostics",diagnostics);properties.SetFloat("_BrushFirstRow",firstRow);properties.SetFloat("_BrushLineCount",rows);properties.SetFloat("_BrushSpanCapacity",capacity);properties.SetFloat("_BrushRowRadius",radius);target.SetPropertyBlock(properties);\r
    LastRenderedSeconds=seconds;BuildCount++;lastHash=InputHash();dirty=false;Status="Ready; overflow is magenta. Call RequestDiagnostics explicitly for span count.";return true;\r
   }catch(Exception e){Status=e.Message;ReleaseTexture();ReleaseBrush();ReleaseProducer();Restore();lastHash=InputHash();dirty=false;return false;}\r
  }\r
  // Explicit, optional asynchronous diagnostic; never called by RenderAt/Update.\r
  public bool RequestDiagnostics(){\r
   if(diagnostics==null||diagnosticPending||!SystemInfo.supportsAsyncGPUReadback)return false;\r
   int version=epoch,limit=capacity;diagnosticPending=true;\r
   AsyncGPUReadback.Request(diagnostics,r=>{if(version!=epoch)return;diagnosticPending=false;if(r.hasError){Status="Diagnostic readback failed";return;}LastMaxSpans=(int)r.GetData<uint>()[0];Status=LastMaxSpans>limit?"GPU span capacity overflow: "+LastMaxSpans+" > "+limit:"Ready; max spans "+LastMaxSpans+" / "+limit;});return true;\r
  }\r
  void RenderProducer(float seconds){\r
   if(!inputGenerator.shader.isSupported)throw new InvalidOperationException("RGBA producer shader is unsupported");\r
   foreach(var name in producerFloatProperties)if(!Finite(inputGenerator.GetFloat(name)))throw new InvalidOperationException("Nonfinite producer parameter: "+name);\r
   foreach(var name in producerVectorProperties){var value=inputGenerator.GetVector(name);for(int i=0;i<4;i++)if(!Finite(value[i]))throw new InvalidOperationException("Nonfinite producer vector: "+name);}\r
   if(!SystemInfo.SupportsRenderTextureFormat(RenderTextureFormat.ARGBHalf))throw new InvalidOperationException("Generator RGBA input requires ARGBHalf");\r
   if(!Finite(generatorDesignSize.x)||!Finite(generatorDesignSize.y)||generatorDesignSize.x<=0||generatorDesignSize.y<=0)throw new InvalidOperationException("Invalid generator design size");\r
   float aspect=generatorDesignSize.x/generatorDesignSize.y;int longest=Mathf.Clamp(resolution,32,1024),w=aspect>=1?longest:Mathf.Max(1,Mathf.RoundToInt(longest*aspect)),h=aspect>=1?Mathf.Max(1,Mathf.RoundToInt(longest/aspect)):longest;\r
   if(!producer||producer.shader!=inputGenerator.shader){Dispose(producer);producer=new Material(inputGenerator){hideFlags=HideFlags.HideAndDontSave};}\r
   if(!producerTexture||producerTexture.width!=w||producerTexture.height!=h){ReleaseProducerTexture();producerTexture=new RenderTexture(w,h,0,RenderTextureFormat.ARGBHalf,RenderTextureReadWrite.Linear){hideFlags=HideFlags.HideAndDontSave,name="Handdrawn RGBA producer",wrapMode=TextureWrapMode.Clamp,filterMode=FilterMode.Bilinear};if(!producerTexture.Create())throw new InvalidOperationException("RGBA producer allocation failed");}\r
   producer.CopyPropertiesFromMaterial(inputGenerator);producer.SetFloat("_Seconds",Mathf.Max(0,seconds));var active=RenderTexture.active;bool srgb=GL.sRGBWrite;try{GL.sRGBWrite=false;Graphics.Blit(null,producerTexture,producer);}finally{RenderTexture.active=active;GL.sRGBWrite=srgb;}\r
  }\r
  void ReleaseProducerTexture(){if(producerTexture){producerTexture.Release();Dispose(producerTexture);producerTexture=null;}}\r
  void ReleaseProducer(){ReleaseProducerTexture();Dispose(producer);producer=null;}\r
  static bool Finite(float value)=>!float.IsNaN(value)&&!float.IsInfinity(value);\r
  void ReleaseBrush(){epoch++;diagnosticPending=false;brush?.Release();counts?.Release();diagnostics?.Release();brush=null;counts=null;diagnostics=null;rows=0;LastMaxSpans=0;}\r
  void ReleaseTexture(){if(coverage){coverage.Release();Dispose(coverage);coverage=null;}}\r
  void Restore(){if(hooked&&target){target.sharedMaterial=previous;target.SetPropertyBlock(previousProperties);}hooked=false;}\r
  void OnDisable(){\r
#if UNITY_EDITOR\r
   UnityEditor.EditorApplication.update-=EditorTick;\r
#endif\r
   ReleaseTexture();ReleaseBrush();ReleaseProducer();Restore();Dispose(generator);Dispose(builder);generator=null;builder=null;builderSource=null;}\r
  static void Dispose(UnityEngine.Object value){if(!value)return;if(Application.isPlaying)Destroy(value);else DestroyImmediate(value);}\r
 }\r
}\r
`,"HanddrawnImporter.cs":`#if UNITY_EDITOR\r
using System;\r
using System.IO;\r
using System.Linq;\r
using System.Security.Cryptography;\r
using UnityEditor;\r
using UnityEngine;\r
namespace __NAMESPACE__ {\r
 public static class Importer {\r
  [Serializable] class Property{public string name,type;public float floatValue;public Vector4 vectorValue;}\r
  [Serializable] class Integrity{public string file,sha256;}\r
  [Serializable] class Files{public string coverageShader,displayShader,compute,input,producerShader;}\r
  [Serializable] class Runtime{public int resolution,spanCapacity,designShortSide,sourceAlphaMode,sourceColorSpace;public string type;}\r
  [Serializable] class Geometry{public float[] designSize;}\r
  [Serializable] class Manifest{public string schema,packageId,mode,coverageShaderName,displayShaderName,producerShaderName;public int version;public Files files;public Runtime runtime;public Geometry geometry;public Property[] sourceMaterialProperties,displayMaterialProperties;public Integrity[] integrity;}\r
  [MenuItem("Assets/Momo Texture Forge/Import handdrawn postprocess __ID__")]\r
  public static void Import(){string file=EditorUtility.OpenFilePanel("Handdrawn postprocess parameters",Application.dataPath,"json");if(!string.IsNullOrEmpty(file))ImportFile(file);}\r
  public static string ImportFile(string path){\r
   var m=JsonUtility.FromJson<Manifest>(File.ReadAllText(path));\r
   if(m==null||m.schema!="momo.handdrawn-postprocess/v1"||m.version!=1||m.packageId!="__ID__"||m.mode!="postprocess"||m.files==null||m.runtime==null||m.runtime.type!="__NAMESPACE__.HanddrawnEffect"||m.geometry?.designSize?.Length!=2||m.displayMaterialProperties==null||m.sourceMaterialProperties==null||m.integrity==null)throw new InvalidOperationException("Invalid unified handdrawn package; retired reference formats are not exported");\r
   if(!SystemInfo.supportsComputeShaders||SystemInfo.graphicsShaderLevel<45||!SystemInfo.SupportsRenderTextureFormat(RenderTextureFormat.RFloat))throw new InvalidOperationException("Handdrawn postprocess requires Compute/SM4.5/RFloat");\r
   string directory=Path.GetDirectoryName(Path.GetFullPath(path)),assets=Path.GetFullPath(Application.dataPath)+Path.DirectorySeparatorChar;if(!directory.StartsWith(assets,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Copy the complete Unity folder below Assets first");string root=directory+Path.DirectorySeparatorChar;\r
   var names=new System.Collections.Generic.HashSet<string>();foreach(var entry in m.integrity){if(entry==null||entry.file==null||!entry.file.StartsWith("Unity/",StringComparison.Ordinal)||!names.Add(entry.file))throw new InvalidOperationException("Invalid integrity list");string file=Path.GetFullPath(Path.Combine(root,entry.file.Substring(6)));if(!file.StartsWith(root,StringComparison.OrdinalIgnoreCase)||!File.Exists(file))throw new InvalidOperationException("Missing package file: "+entry.file);using(var sha=SHA256.Create())if(BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(file))).Replace("-","").ToLowerInvariant()!=entry.sha256)throw new InvalidOperationException("Package integrity mismatch: "+entry.file);}\r
   foreach(string file in new[]{m.files.coverageShader,m.files.displayShader,m.files.compute,m.files.input,"HanddrawnEffect.cs","handdrawn-input.hlsl","hatch-brush.hlsl","ROUGH-LICENSE.txt","Editor/__ID__Importer.cs"})if(!names.Contains("Unity/"+file))throw new InvalidOperationException("Missing required integrity record: "+file);\r
   Func<string,string> assetPath=file=>"Assets/"+Path.GetFullPath(Path.Combine(directory,file)).Substring(assets.Length).Replace('\\\\','/');\r
   Shader coverage=AssetDatabase.LoadAssetAtPath<Shader>(assetPath(m.files.coverageShader)),display=AssetDatabase.LoadAssetAtPath<Shader>(assetPath(m.files.displayShader));var compute=AssetDatabase.LoadAssetAtPath<ComputeShader>(assetPath(m.files.compute));Check(coverage,m.coverageShaderName);Check(display,m.displayShaderName);if(!compute||!compute.HasKernel("BuildHatch")||!compute.HasKernel("ClearDiagnostics"))throw new InvalidOperationException("Handdrawn compute failed import");\r
   if(m.runtime.resolution<32||m.runtime.resolution>1024||m.runtime.spanCapacity<1||m.runtime.spanCapacity>128||m.runtime.designShortSide!=512)throw new InvalidOperationException("Invalid resource/design contract");\r
   string texturePath=assetPath(m.files.input);var importer=AssetImporter.GetAtPath(texturePath) as TextureImporter;if(importer==null)throw new InvalidOperationException("Missing RGBA input texture");importer.textureType=TextureImporterType.Default;importer.sRGBTexture=true;importer.alphaIsTransparency=false;importer.alphaSource=TextureImporterAlphaSource.FromInput;importer.mipmapEnabled=false;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.npotScale=TextureImporterNPOTScale.None;importer.wrapMode=TextureWrapMode.Clamp;importer.filterMode=FilterMode.Bilinear;importer.GetSourceTextureWidthAndHeight(out int width,out int height);importer.maxTextureSize=Mathf.Clamp(Mathf.NextPowerOfTwo(Mathf.Max(width,height)),32,16384);importer.SaveAndReimport();var input=AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath);if(!input||input.width!=width||input.height!=height)throw new InvalidOperationException("Input import resized the RGBA stage; check platform overrides");\r
   Material effectMaterial=new Material(display),producerMaterial=null;GameObject quad=null;string output=assetPath("Imported-__ID__");bool created=false;\r
   if(Directory.Exists(Path.Combine(directory,"Imported-__ID__")))throw new InvalidOperationException("Import destination exists; use its existing Prefab or a new asset folder");\r
   try{\r
    Apply(effectMaterial,m.displayMaterialProperties);effectMaterial.SetTexture("_InputTex",input);\r
    if(!string.IsNullOrEmpty(m.files.producerShader)){if(!names.Contains("Unity/"+m.files.producerShader)||!names.Contains("Unity/__ID__Producer.hlsl"))throw new InvalidOperationException("Missing reviewed RGBA producer files");var shader=AssetDatabase.LoadAssetAtPath<Shader>(assetPath(m.files.producerShader));Check(shader,m.producerShaderName);producerMaterial=new Material(shader);Apply(producerMaterial,m.sourceMaterialProperties);}\r
    quad=GameObject.CreatePrimitive(PrimitiveType.Quad);quad.name="Handdrawn postprocess __ID__";UnityEngine.Object.DestroyImmediate(quad.GetComponent<Collider>());\r
    var effect=quad.AddComponent<HanddrawnEffect>();effect.displayTemplate=effectMaterial;effect.inputGenerator=producerMaterial;effect.coverageShader=coverage;effect.hatchBuilder=compute;effect.resolution=m.runtime.resolution;effect.spanCapacity=m.runtime.spanCapacity;effect.designShortSide=m.runtime.designShortSide;effect.sourceAlphaMode=(HanddrawnEffect.SourceAlphaMode)m.runtime.sourceAlphaMode;effect.sourceColorSpace=(HanddrawnEffect.SourceColorSpace)m.runtime.sourceColorSpace;\r
    effect.capturedDesignSize=new Vector2(m.geometry.designSize[0],m.geometry.designSize[1]);effect.initialInputTexture=input;effect.initialInputWidth=input.width;effect.initialInputHeight=input.height;effect.generatorDesignSize=effect.capturedDesignSize;effect.producerFloatProperties=m.sourceMaterialProperties.Where(p=>p.type=="Float").Select(p=>p.name).ToArray();effect.producerVectorProperties=m.sourceMaterialProperties.Where(p=>p.type=="Vector").Select(p=>p.name).ToArray();\r
    if(!effect.RenderAt(0))throw new InvalidOperationException(effect.Status);effect.enabled=false;\r
    Directory.CreateDirectory(Path.Combine(directory,"Imported-__ID__"));AssetDatabase.Refresh();created=true;AssetDatabase.CreateAsset(effectMaterial,output+"/Handdrawn.mat");if(producerMaterial)AssetDatabase.CreateAsset(producerMaterial,output+"/InputProducer.mat");quad.GetComponent<MeshRenderer>().sharedMaterial=effectMaterial;effect.enabled=true;\r
    string prefab=output+"/Handdrawn.prefab";PrefabUtility.SaveAsPrefabAsset(quad,prefab);AssetDatabase.SaveAssets();Selection.activeObject=AssetDatabase.LoadAssetAtPath<GameObject>(prefab);return prefab;\r
   }catch{if(created)AssetDatabase.DeleteAsset(output);throw;}\r
   finally{if(quad)UnityEngine.Object.DestroyImmediate(quad);if(effectMaterial&&!EditorUtility.IsPersistent(effectMaterial))UnityEngine.Object.DestroyImmediate(effectMaterial);if(producerMaterial&&!EditorUtility.IsPersistent(producerMaterial))UnityEngine.Object.DestroyImmediate(producerMaterial);}\r
  }\r
  static void Check(Shader shader,string name){if(!shader||shader.name!=name||ShaderUtil.ShaderHasError(shader)||!shader.isSupported)throw new InvalidOperationException("Required shader failed compilation: "+name);}\r
  static void Apply(Material material,Property[] values){foreach(var p in values){if(p==null||!material.HasProperty(p.name))throw new InvalidOperationException("Unknown mapped material property: "+p?.name);if(p.type=="Float"){if(float.IsNaN(p.floatValue)||float.IsInfinity(p.floatValue))throw new InvalidOperationException("Nonfinite material value");material.SetFloat(p.name,p.floatValue);}else if(p.type=="Color")material.SetColor(p.name,new Color(p.vectorValue.x,p.vectorValue.y,p.vectorValue.z,p.vectorValue.w));else if(p.type=="Vector")material.SetVector(p.name,p.vectorValue);else throw new InvalidOperationException("Unknown material mapping type");}}\r
 }\r
}\r
#endif\r
`,"ROUGH-LICENSE.txt":`MIT License\r
\r
Copyright (c) 2019 Preet Shihn\r
\r
Permission is hereby granted, free of charge, to any person obtaining a copy\r
of this software and associated documentation files (the "Software"), to deal\r
in the Software without restriction, including without limitation the rights\r
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\r
copies of the Software, and to permit persons to whom the Software is\r
furnished to do so, subject to the following conditions:\r
\r
The above copyright notice and this permission notice shall be included in all\r
copies or substantial portions of the Software.\r
\r
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\r
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\r
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\r
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\r
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\r
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\r
SOFTWARE.\r
`,"README.md":"# 统一 RGBA 手绘后处理\r\n\r\n<!-- doc-language -->\r\n[简体中文](README.md) · [English](README.en.md)\r\n<!-- /doc-language -->\r\n\r\n正式流程只有 **RGBA 输入 → 自动轮廓与填充 → 输出**。没有轻量填充或冻结描边出口。图形生成器只是可选输入适配器；Texture2D、2D 单采样 RenderTexture 与生成器共用同一手绘核心、Compute 和运行组件。`parameters.json` 使用 `momo.handdrawn-postprocess/v1`，旧项目节点数据可读，但旧 shaderMode 明确提示迁移到 `postprocess`。\r\n\r\n完整复制 `Unity/` 到 Assets 下新目录，等待编译，然后用 manifest 的 `unityImporter.menu` 或 `unityImporter.type.ImportFile(参数绝对路径)` 创建材质和 Prefab。文件哈希、Compute/SM4.5/RFloat、输入尺寸和资源预算会检查；不覆盖旧输出。每包命名空间/Shader 名独立，Prefab 保存材质、覆盖 Shader、Compute 和可选 RGBA 生成材质的引用。验证范围为 Unity 2022.3 / URP14，移动端/Player 未验证。\r\n\r\n`HanddrawnEffect.displayTemplate._InputTex` 接受普通贴图或运行时 RT；静态输入按贴图/材质版本缓存，RT 自动逐帧更新，特殊原生插件可显式 `Refresh()`。设置 `inputGenerator` 时由独立材质产生 RGBA，随后进入同一后处理，不复制手绘算法；关闭 `animate` 并 `RenderAt(seconds)` 可按秒采样。生成器输入要求 ARGBHalf。初始捕获贴图/生成器保留原生阶段的裁剪设计尺寸；换图或 RT 后自动按新比例和短边512计算，无需清零参数。只有明确启用 `useFixedDesignSize` 才使用 `fixedDesignSize` 覆盖。切出生成器输入会立即释放不再使用的 RGBA 生成资源。\r\n\r\n`sourceAlphaMode` 为 Straight=0 / Premultiplied=1；`sourceColorSpace` 为 UnitySampled=0 / NativeSRGB=1。默认图片按 Unity 正常 sRGB 导入、Straight 输入。原生数值 sRGB 数据 RT 使用 NativeSRGB；已预乘输入不会重复乘 alpha。Native source0 读取 alpha，source1 取**预乘数值 sRGB RGB 的点积**，与网页阶段一致；2/3/4 是额外的线性亮度、反线性亮度、红通道，不混用原生索引。颜色属性按 sRGB 调用 Unity SetColor，不提前 `.linear`。\r\n\r\n设计尺度按**短边512**，长方形按比例扩展长边；不是最长边512。`parameters.nativeFillMapping`：原生0→OriginalInput2（保留整个原输入，可叠加描边），1→Solid0，2→IndividualHachure1，4→NoFill3（仅描边）。`_UseSourceColor` 是额外的填充取原色选项，不代替 OriginalInput。节点透明度在输入/填充/描边合成后只乘一次。粗糙度1.3、弓度、随机偏移、种子、线宽和双笔保持原生单位；不再有旧归一化粗糙度控制。\r\n\r\n首批原生填充与参数范围由支持报告列出。未实现的网页样式/虚线/顶点选项明确拒绝；向量平滑、简化和曲线预处理仅在声明的默认近似值可导出，改变它们会报告具体路径。网页选项不会被删除来伪装支持。轮廓与随机流仍不是完整 Rough.js 等价实现，不能称为逐像素还原。\r\n\r\n运行资源包括覆盖 RFloat RT、行区间/双三次笔画缓冲和诊断缓冲；生成器适配另有 RGBA RT。默认32区间/行，可调1–128，最多4096行/64 MiB缓冲/128邻行半径，超预算失败并释放。溢出显示洋红，显式 `RequestDiagnostics()` 异步读计数，不逐帧读回CPU。禁用释放全部资源并恢复原Renderer状态，重启/间距/分辨率变化重建。输入PNG是后处理的真实原始输入，不是预烘焙边框；原生输出参考只用于对照。\r\n","README.en.md":"# Unified RGBA handdrawn postprocess\r\n\r\n<!-- doc-language -->\r\n[简体中文](README.md) · [English](README.en.md)\r\n<!-- /doc-language -->\r\n\r\nThe sole formal pipeline is **RGBA input → automatic contours and fill → output**. There is no light fill-only or frozen-stroke export. Texture2D, single-sampled2D RenderTexture and optional generators share one core, Compute and runtime component. The manifest uses `momo.handdrawn-postprocess/v1`; old project nodes remain readable, while retired shader modes return migration to `postprocess`.\r\n\r\nCopy the complete `Unity/` directory into a new Assets folder. After compilation invoke `unityImporter.menu` or `unityImporter.type.ImportFile(absoluteParametersPath)` to create materials and a Prefab. Import verifies hashes, Compute/SM4.5/RFloat, input dimensions and budgets, without overwriting output. Namespaces/Shader names are unique per package. Prefabs serialize materials, coverage Shader, Compute and the optional RGBA producer. Target Unity2022.3/URP14; mobile/Player are unverified.\r\n\r\n`HanddrawnEffect.displayTemplate._InputTex` accepts images or runtime RT. Static input caches by texture/material version; RT refreshes every frame. Native plugins can call `Refresh()`. Assigning `inputGenerator` renders RGBA with a separate material before the exact same postprocess, without duplicating handdrawn logic. Disable `animate` and call `RenderAt(seconds)` for explicit sampling. Producer input requires ARGBHalf. The initial captured image/producer retains native stage crop geometry. A replacement image or RT automatically uses its new aspect and short side512; no manual clearing is required. Only explicit `useFixedDesignSize` enables the `fixedDesignSize` override. Switching away from generator input releases its unused RGBA resources immediately.\r\n\r\n`sourceAlphaMode`: Straight0 / Premultiplied1. `sourceColorSpace`: UnitySampled0 / NativeSRGB1. Ordinary sRGB images use default Unity sampling and straight alpha. Numeric sRGB data RT uses NativeSRGB; premultiplied inputs are not multiplied twice. Native source0 reads alpha; source1 computes **dot of premultiplied numeric sRGB RGB**, matching the web stage. Indices2/3/4 are separate linear luminance, inverse linear luminance and red extensions. Color-property SetColor receives sRGB; do not pre-apply `.linear`.\r\n\r\nDesign scale is **short side512**, extending the long side proportionally. `parameters.nativeFillMapping`: native0→OriginalInput2 (entire original input plus optional outlines),1→Solid0,2→IndividualHachure1,4→NoFill3 (outlines only). `_UseSourceColor` is an extra fill-color option, not OriginalInput. Node opacity is applied once after input/fill/stroke composition. Roughness1.3, bowing, max offset, seed, width and double pens keep native units; the normalized legacy roughness control is removed.\r\n\r\nSupport reports enumerate implemented styles/parameters. Unsupported native styles, dashes and vertex options fail explicitly. Vector smoothing/simplification/curve preprocessing currently accepts only declared default approximations; non-default values report their exact path. Editor options remain available rather than being deleted to imply support. Contours and random streams are still approximations, not complete Rough.js equivalence.\r\n\r\nResources are one RFloat coverage RT, row/run double-cubic buffers and diagnostics, plus an RGBA RT for a producer. Default32 spans/row, adjustable1–128; limits4096 rows,64MiB buffers and128 neighboring rows. Budget errors release resources; overflow displays magenta. `RequestDiagnostics()` performs optional explicit asynchronous readback, never per-frame CPU readback. Disable releases all resources and restores Renderer state; restart/gap/resolution changes rebuild. The input PNG is the actual raw RGBA stage, never a baked outline. Native output references are comparisons only.\r\n"};var ue="momo.texture-pack/v1",pe="momo-pattern/16-v1",V="momo-pattern/16-v1+generator-v1";async function Ge(t){let o=await z(t);if(!JSON.parse(new TextDecoder().decode(o.get("manifest.json"))).assets?.some(e=>U(JSON.parse(new TextDecoder().decode(o.get(e.file))))))return t;let l=await ge(t);try{return l.register(),await he(l.payload,l.payload.schema==="momo.texture-assets/v1"?{assets:[...l.mapping.values()].map(e=>[e,R(e)])}:{})}finally{l.rollback()}}var b=new TextEncoder,E=new TextDecoder("utf-8",{fatal:!0}),de=t=>{let o="";for(let s=0;s<t.length;s+=8192)o+=String.fromCharCode(...t.subarray(s,s+8192));return btoa(o)};function G(t,o){let s=t.schema==="momo.texture-library/v1"?t.presets?.map(a=>a.root):[t.root,...(t.projectResources??[]).map(a=>a.root)];if(!Array.isArray(s))throw Error("组件入口无效");let l=0;function e(a){if(!a||++l>10240)throw Error("节点内容无效或过多");if(o(a),a.children)for(let f of a.children)e(f);a.mask&&e(a.mask)}for(let a of s)e(a)}async function he(t,{assets:o=null,includeResources:s=!1}={}){H(t.graphicResource?.aliases);let l=structuredClone(t),e=new Map(o??(s?[...N.keys()].map(i=>[i,R(i)]):[]));o||G(l,i=>{if(i.kind==="shape"&&e.set(i.type,R(i.type)),i.arrange?.length>39){let n=[i.arrange[39],...(i.tracks?.["arrange.39"]?.keys??[]).map(p=>p[1])];for(let p of n){let m=C[p];if(!m)throw Error("密度图资源不存在");e.set(m.id,R(m.id))}i.packDensity={base:C[i.arrange[39]].id,keys:n.slice(1).map(p=>C[p].id)}}});let a=new Map,f=[],c=(i,n)=>a.set(i,n),g=(i,n)=>c(i,b.encode(JSON.stringify(n,null,2))),d=new Set;l.schema!=="momo.texture-assets/v1"&&G(l,i=>{for(let n of Z)K(i,n.id)&&d.add(n.id)});let r={};for(let i of d){let n=t.engineShaderModules?.[i]??fe.effects[i];if(!n)continue;k(n);let p=structuredClone(n);p.files={};for(let[m,S]of Object.entries(n.files)){let v="engine-shaders/effects/"+i+"/"+m;c(v,b.encode(S)),p.files[m]={file:v}}r[i]=p}if(d.has("sketch"))for(let[i,n]of Object.entries(le))c("engine-shaders/effects/sketch/Unity/"+i,b.encode(n));Object.keys(r).length?l.engineShaderModules=r:delete l.engineShaderModules;for(let[i,n]of e){D(n);let p=await se(n);D(p);let m=await T(p),S=structuredClone(p);if(S.libraries={},p.engineShaders?.unity){S.engineShaders.unity.files={};for(let[h,y]of Object.entries(p.engineShaders.unity.files)){let _=`shaders/${m}/${h}`;c(_,b.encode(y)),S.engineShaders.unity.files[h]={file:_}}}for(let[h,y]of Object.entries(p.libraries)){let _=`formulas/${await T(y)}.glsl`;c(_,b.encode(y)),S.libraries[h]={file:_}}for(let h of[S.definition.outputs.scalar,S.definition.seamless.source].filter(Boolean)){let y=`formulas/${await T(h.inline)}.glsl`;c(y,b.encode(h.inline)),delete h.inline,h.file=y}if(p.kind==="image"){let h=`images/${m}.${p.mime==="image/svg+xml"?"svg":p.mime.split("/")[1]}`;c(h,Uint8Array.from(atob(p.data),y=>y.charCodeAt(0))),delete S.data,S.file=h}let v=`shapes/${m}.json`;g(v,S),f.push({id:i,hash:m,file:v})}let u=[...e.values()].some(i=>!!i.definition.generator);if(g("content.json",l),g("manifest.json",{schema:ue,abi:u?V:pe,content:"content.json",assets:f}),[...a.values()].reduce((i,n)=>i+n.length,0)>P)throw Error("资源包超过64MB");return oe([...a].map(([i,n])=>({name:i,data:n})))}async function ge(t){let o=await z(t),s=r=>{F(r);let u=o.get(r);if(!u)throw Error("缺少资源文件："+r);return u},l=r=>JSON.parse(E.decode(s(r))),e=l("manifest.json");if(e.schema!==ue||![pe,V].includes(e.abi))throw Error("资源包格式或公式接口版本不兼容");if(!Array.isArray(e.assets))throw Error("资源包图形列表格式无效");let a=l(e.content);H(a.graphicResource?.aliases);let f=[],c=new Map;if(a.engineShaderModules)for(let r of Object.values(a.engineShaderModules)){for(let[u,i]of Object.entries(r.files??{}))r.files[u]=E.decode(s(i.file));k(r)}try{for(let r of e.assets){if(typeof r.id!="string"||c.has(r.id))throw Error("图形资源ID重复或无效");let u=l(r.file);for(let[n,p]of Object.entries(u.libraries??{}))u.libraries[n]=E.decode(s(p.file));for(let n of[u.definition?.outputs?.scalar,u.definition?.seamless?.source].filter(Boolean))n.inline=E.decode(s(n.file)),delete n.file;if(u.kind==="image"&&(u.data=de(s(u.file)),delete u.file),u.engineShaders?.unity)for(let[n,p]of Object.entries(u.engineShaders.unity.files??{}))u.engineShaders.unity.files[n]=E.decode(s(p.file));if(u.definition?.generator&&e.abi!==V)throw Error("生成器资源包缺少接口能力声明");if(D(u),await T(u)!==r.hash)throw Error("图形资源内容校验失败："+r.id);let i="asset_"+r.hash;try{await T(L(u.definition.id))===r.hash&&(i=u.definition.id)}catch{}c.set(r.id,i),!M.has(i)&&!f.some(n=>n[0]===i)&&f.push([i,u,await te(u)])}a.schema!=="momo.texture-assets/v1"&&G(a,r=>{if(r.kind==="shape"){if(!c.has(r.type))throw Error("缺少图形依赖："+r.type);r.type=c.get(r.type)}if(r.arrange?.[0]===12&&!r.packDensity)throw Error("缺少密度图依赖");if(r.packDensity){for(let u of[r.packDensity.base,...r.packDensity.keys])if(!c.has(u))throw Error("缺少密度图："+u)}})}catch(r){for(let[,,u]of f)u?.close();throw r}await ae(c.values());let g=!1,d=!1;return{payload:a,prepared:f,mapping:c,register(){if(!g){for(let r of f)re(...r);g=!0,a.schema!=="momo.texture-assets/v1"&&G(a,r=>{if(r.packDensity){r.arrange[39]=M.get(c.get(r.packDensity.base)).index;let u=r.tracks?.["arrange.39"]?.keys??[];if(u.length!==r.packDensity.keys.length)throw Error("密度图轨道无效");u.forEach((i,n)=>i[1]=M.get(c.get(r.packDensity.keys[n])).index),delete r.packDensity}})}},async persist(){await ee([...N]),d=!0},rollback(){if(!d)if(g)for(let[r]of[...f].reverse())ne(r);else for(let[,,r]of f)r?.close()}}}async function Be(t){if(t.size>16*1024*1024)throw Error("图片超过16MB");let o=L("Circle");delete o.engineShaders,o.kind="image",o.mime=/\.svg$/i.test(t.name)?"image/svg+xml":t.type,o.mime==="image/svg+xml"&&$(await t.text()),o.data=de(new Uint8Array(await t.arrayBuffer()));let s=o.definition;return s.id="Image",delete s.aliases,s.name=t.name.replace(/\.[^.]+$/,"").slice(0,80)||"图片",s.parameters=[{slot:0,key:"R",variable:"imageMode",role:"image-mode",aliases:{"zh-CN":"图片显示",en:"Image mode"},label:"图片显示",min:0,max:2,step:1,default:0}],s.defaults=Array(16).fill(0),s.editor={kind:"parameters"},s.seamless={kind:"blend"},s.outputs={scalar:{kind:"body",inline:"vec2 size=vec2(textureSize(assetImage,0));float ratio=size.x/size.y;u=(u-.5)*vec2(max(1.,1./ratio),max(1.,ratio))+.5;if(any(lessThan(u,vec2(0)))||any(greaterThan(u,vec2(1))))return 0.;vec4 pixel=texture(assetImage,u);return a.x>.5&&a.x<1.5?dot(pixel.rgb,vec3(.2126,.7152,.0722))*pixel.a:pixel.a;",libraries:["math-v1"]}},o}export{le as a,se as b,P as c,F as d,z as e,ue as f,pe as g,V as h,Ge as i,he as j,ge as k,Be as l};
