using System;
using UnityEngine;
using UnityEngine.Rendering;
namespace __NAMESPACE__ {
 [ExecuteAlways,RequireComponent(typeof(MeshRenderer))]
 public sealed class HanddrawnEffect:MonoBehaviour {
  [Tooltip("在此材质的 Input texture 中指定贴图并调整手绘参数。")]
  public Material displayTemplate;
  public Material inputGenerator;
  public bool animate=true;
  public enum SourceAlphaMode{Straight=0,Premultiplied=1}
  public enum SourceColorSpace{UnitySampled=0,NativeSRGB=1}
  public SourceAlphaMode sourceAlphaMode;
  public SourceColorSpace sourceColorSpace;
  [HideInInspector] public string[] producerFloatProperties=new string[0],producerVectorProperties=new string[0];
  public bool useFixedDesignSize;
  public Vector2 fixedDesignSize=new Vector2(512,512);
  [HideInInspector] public Texture initialInputTexture;
  [HideInInspector] public int initialInputWidth,initialInputHeight;
  [HideInInspector] public Vector2 capturedDesignSize;
  public Vector2 generatorDesignSize=new Vector2(512,512);
  [HideInInspector] public Shader coverageShader;
  [HideInInspector] public ComputeShader hatchBuilder;
  [Range(32,1024)] public int resolution=512;
  [Range(1,128)] public int spanCapacity=32;
  [Tooltip("RenderTexture 默认每帧更新。其他动态贴图可开启此项；静态图片按变化缓存。")]
  public bool refreshEveryFrame;
  [Range(32,2048)] public int designShortSide=512;
  [Min(0)] public float explicitSeconds;
  public string Status{get;private set;}="Not rendered";
  public int LastMaxSpans{get;private set;}
  public int BrushLineCount=>rows;
  public long AllocatedBytes=>coverage?(long)coverage.width*coverage.height*4:0;
  public long BrushBufferBytes=>brush!=null?(long)brush.count*brush.stride+counts.count*4L+4:0;
  public RenderTexture Source=>coverage;
  public float LastRenderedSeconds{get;private set;}
  public int BuildCount{get;private set;}
  int lastHash;
  static readonly string[] Floats={"_MaskMode","_PreserveAspect","_UseSourceColor","_Threshold","_StrokeWidth","_StrokeRoughness","_DoubleStroke","_StrokeOpacity","_NodeOpacity","_Style","_Gap","_Width","_Angle","_FillRoughness","_FillBowing","_FillMaxOffset","_DoubleFill","_Seed","_InkOpacity","_PaperOpacity","_DebugMode"};
  static readonly string[] Vectors={"_InkColor","_PaperColor","_StrokeColor","_Scroll"};
  Texture DeclaredInput=>displayTemplate&&displayTemplate.HasProperty("_InputTex")?displayTemplate.GetTexture("_InputTex"):null;
  public Texture InputTexture=>inputGenerator?producerTexture:DeclaredInput;
  public long ProducerBytes=>producerTexture?(long)producerTexture.width*producerTexture.height*8:0;
  Material producer;RenderTexture producerTexture;
  int InputHash(){unchecked{int h=17;
   h=h*31+(displayTemplate?displayTemplate.GetInstanceID():0);
   h=h*31+(coverageShader?coverageShader.GetInstanceID():0);h=h*31+(hatchBuilder?hatchBuilder.GetInstanceID():0);
   h=h*31+resolution;h=h*31+spanCapacity;h=h*31+designShortSide;h=h*31+fixedDesignSize.GetHashCode();h=h*31+(useFixedDesignSize?1:0);h=h*31+capturedDesignSize.GetHashCode();h=h*31+generatorDesignSize.GetHashCode();h=h*31+(int)sourceAlphaMode;h=h*31+(int)sourceColorSpace;h=h*31+(inputGenerator?inputGenerator.GetInstanceID():0);if(inputGenerator){foreach(var p in producerFloatProperties)h=h*31+inputGenerator.GetFloat(p).GetHashCode();foreach(var p in producerVectorProperties)h=h*31+inputGenerator.GetVector(p).GetHashCode();}h=h*31+explicitSeconds.GetHashCode();
   if(displayTemplate&&displayTemplate.shader.name=="__DISPLAY_SHADER__"){foreach(var p in Floats)h=h*31+displayTemplate.GetFloat(p).GetHashCode();foreach(var p in Vectors)h=h*31+displayTemplate.GetVector(p).GetHashCode();h=h*31+displayTemplate.GetTextureScale("_InputTex").GetHashCode();h=h*31+displayTemplate.GetTextureOffset("_InputTex").GetHashCode();}
   var input=InputTexture;if(input){h=h*31+input.GetInstanceID();h=h*31+(int)input.updateCount;h=h*31+input.width;h=h*31+input.height;}return h;
  }}
  [ContextMenu("刷新手绘 / Refresh")] public void Refresh(){dirty=true;if(isActiveAndEnabled)RenderAt(explicitSeconds);}
  Material generator;ComputeShader builder,builderSource;RenderTexture coverage;
  ComputeBuffer brush,counts,diagnostics;int rows,firstRow,capacity,epoch;bool hooked,dirty=true,diagnosticPending;
  MeshRenderer target;Material previous;MaterialPropertyBlock properties,previousProperties;
  void OnEnable(){dirty=true;
#if UNITY_EDITOR
   UnityEditor.EditorApplication.update+=EditorTick;
#endif
  }
#if UNITY_EDITOR
  void EditorTick(){if(Application.isPlaying||!isActiveAndEnabled)return;int count=BuildCount;Update();if(count!=BuildCount){UnityEditor.EditorApplication.QueuePlayerLoopUpdate();UnityEditor.SceneView.RepaintAll();}}
#endif
  void OnValidate(){dirty=true;}
  void Update(){
   if(inputGenerator&&Application.isPlaying&&animate)RenderAt(Time.timeSinceLevelLoad);else if(dirty||InputHash()!=lastHash||refreshEveryFrame||!inputGenerator&&InputTexture is RenderTexture)RenderAt(explicitSeconds);
  }
  public bool RenderAt(float seconds){
   try{
    if(float.IsNaN(seconds)||float.IsInfinity(seconds))throw new InvalidOperationException("Time must be finite seconds");
    if(!displayTemplate||!coverageShader||!hatchBuilder)throw new InvalidOperationException("Missing handdrawn material, coverage shader or compute reference");
    if(displayTemplate.shader.name!="__DISPLAY_SHADER__")throw new InvalidOperationException("Use the Texture Handdrawn shader on the material");
    if((int)sourceAlphaMode<0||(int)sourceAlphaMode>1||(int)sourceColorSpace<0||(int)sourceColorSpace>1)throw new InvalidOperationException("Unknown RGBA input encoding");
    if(inputGenerator)RenderProducer(seconds);else ReleaseProducer();
    var input=InputTexture;if(!input||input==Texture2D.whiteTexture)throw new InvalidOperationException("Assign an input texture to the handdrawn material");
    if(input==coverage)throw new InvalidOperationException("Input cannot be this effect's generated coverage texture");
    if(input.dimension!=TextureDimension.Tex2D)throw new InvalidOperationException("Input must be a 2D texture or 2D RenderTexture");
    if(input is RenderTexture inputRT&&(!inputRT.IsCreated()||inputRT.antiAliasing!=1))throw new InvalidOperationException("Input RenderTexture must be created, resolved and single-sampled");
    foreach(var p in Floats){float v=displayTemplate.GetFloat(p);if(float.IsNaN(v)||float.IsInfinity(v))throw new InvalidOperationException("Material value must be finite: "+p);}
    foreach(var p in Vectors){var v=displayTemplate.GetVector(p);for(int j=0;j<4;j++)if(float.IsNaN(v[j])||float.IsInfinity(v[j]))throw new InvalidOperationException("Material vector must be finite: "+p);}
    var scale=displayTemplate.GetTextureScale("_InputTex");var offsetUV=displayTemplate.GetTextureOffset("_InputTex");
    if(!Finite(scale.x)||!Finite(scale.y)||!Finite(offsetUV.x)||!Finite(offsetUV.y))throw new InvalidOperationException("Texture scale/offset must be finite");
    float mode=displayTemplate.GetFloat("_MaskMode");if(mode<0||mode>4||mode!=Mathf.Floor(mode))throw new InvalidOperationException("Unknown mask channel");
    if(displayTemplate.GetFloat("_Threshold")<=0||displayTemplate.GetFloat("_Threshold")>=1)throw new InvalidOperationException("Contour threshold must be strictly between 0 and 1");
    if(displayTemplate.GetFloat("_FillRoughness")<0||displayTemplate.GetFloat("_FillMaxOffset")<0||displayTemplate.GetFloat("_Width")<=0||displayTemplate.GetFloat("_Gap")<1)throw new InvalidOperationException("Invalid pen width/gap/roughness/randomness");
    if(!SystemInfo.supportsComputeShaders||SystemInfo.graphicsShaderLevel<45||!SystemInfo.SupportsRenderTextureFormat(RenderTextureFormat.RFloat))throw new InvalidOperationException("Compute, SM4.5 and RFloat are required");
    if(!coverageShader.isSupported||!displayTemplate.shader.isSupported)throw new InvalidOperationException("A required shader is unsupported");
    float style=displayTemplate.GetFloat("_Style");if(style<0||style>3||style!=Mathf.Floor(style))throw new InvalidOperationException("Unsupported handdrawn fill; use the declared native mapping");
    float imageAspect=(float)input.width/input.height;
    int pixels=Mathf.Clamp(designShortSide,32,2048);
    bool captured=inputGenerator||input==initialInputTexture&&input.width==initialInputWidth&&input.height==initialInputHeight;var fixedSize=useFixedDesignSize?fixedDesignSize:captured?capturedDesignSize:Vector2.zero;
    var design=fixedSize.x>0&&fixedSize.y>0?new Vector4(fixedSize.x,fixedSize.y,0,0):imageAspect>=1?new Vector4(pixels*imageAspect,pixels,0,0):new Vector4(pixels,pixels/imageAspect,0,0);if(!Finite(design.x)||!Finite(design.y)||design.x<=0||design.y<=0||design.x>16384||design.y>16384)throw new InvalidOperationException("Invalid design size");
    if(!generator||generator.shader!=coverageShader){Dispose(generator);generator=new Material(coverageShader){hideFlags=HideFlags.HideAndDontSave};}
    if(!builder||builderSource!=hatchBuilder){Dispose(builder);builder=Instantiate(hatchBuilder);builderSource=hatchBuilder;builder.hideFlags=HideFlags.HideAndDontSave;}
    if(!hooked){target=GetComponent<MeshRenderer>();previous=target.sharedMaterial;previousProperties=new MaterialPropertyBlock();target.GetPropertyBlock(previousProperties);properties=new MaterialPropertyBlock();hooked=true;}
    int longest=Mathf.Clamp(resolution,32,1024);float aspect=design.x/design.y;
    int width=aspect>=1?longest:Mathf.Max(1,Mathf.RoundToInt(longest*aspect)),height=aspect>=1?Mathf.Max(1,Mathf.RoundToInt(longest/aspect)):longest;
    if(!coverage||coverage.width!=width||coverage.height!=height){ReleaseTexture();coverage=new RenderTexture(width,height,0,RenderTextureFormat.RFloat,RenderTextureReadWrite.Linear){name="Texture Forge live coverage",hideFlags=HideFlags.HideAndDontSave,wrapMode=TextureWrapMode.Clamp,filterMode=FilterMode.Bilinear,useMipMap=false,autoGenerateMips=false};if(!coverage.Create())throw new InvalidOperationException("Coverage allocation failed");}
    generator.SetTexture("_InputTex",input);generator.SetTextureScale("_InputTex",scale);generator.SetTextureOffset("_InputTex",offsetUV);generator.SetFloat("_MaskMode",mode);generator.SetFloat("_InputPremultiplied",inputGenerator?0:(float)sourceAlphaMode);generator.SetFloat("_InputEncoding",inputGenerator?0:(float)sourceColorSpace);
    var active=RenderTexture.active;bool srgb=GL.sRGBWrite;
    try{GL.sRGBWrite=false;Graphics.Blit(null,coverage,generator,0);}finally{RenderTexture.active=active;GL.sRGBWrite=srgb;}
    float gap=Mathf.Max(1,displayTemplate.GetFloat("_Gap"));int half=Mathf.CeilToInt(new Vector2(design.x,design.y).magnitude*.5f/gap)+3,lineCount=half*2+1;
    int requestedCapacity=Mathf.Clamp(spanCapacity,1,128);long bytes=(long)lineCount*requestedCapacity*2*3*16+lineCount*4L+4;
    if(lineCount>4096||bytes>67108864)throw new InvalidOperationException("Live pen allocation exceeds 4096 rows or 64 MiB; increase gap or reduce capacity/design size");
    float rough=displayTemplate.GetFloat("_FillRoughness"),offset=displayTemplate.GetFloat("_FillMaxOffset"),bow=displayTemplate.GetFloat("_FillBowing"),penWidth=displayTemplate.GetFloat("_Width");
    int radius=Mathf.CeilToInt((penWidth*.5f+offset*rough+Mathf.Abs(bow)*offset*new Vector2(design.x,design.y).magnitude/200*rough+2)/gap)+1;
    if(radius>128)throw new InvalidOperationException("Pen search radius exceeds 128 rows; reduce roughness/bowing/randomness/width or increase gap");
    if(brush==null||rows!=lineCount||capacity!=requestedCapacity){ReleaseBrush();rows=lineCount;capacity=requestedCapacity;firstRow=-half;brush=new ComputeBuffer(rows*capacity*2*3,16);counts=new ComputeBuffer(rows,4);diagnostics=new ComputeBuffer(1,4);}
    int kernel=builder.FindKernel("BuildHatch"),clear=builder.FindKernel("ClearDiagnostics");builder.SetBuffer(clear,"_BrushDiagnostics",diagnostics);builder.Dispatch(clear,1,1,1);
    builder.SetTexture(kernel,"_Coverage",coverage);builder.SetBuffer(kernel,"_BrushData",brush);builder.SetBuffer(kernel,"_BrushCounts",counts);builder.SetBuffer(kernel,"_BrushDiagnostics",diagnostics);
    builder.SetInt("_LineCount",rows);builder.SetInt("_FirstRow",firstRow);builder.SetInt("_SpanCapacity",capacity);builder.SetVector("_DesignSize",design);builder.SetFloat("_Gap",gap);builder.SetFloat("_Angle",-displayTemplate.GetFloat("_Angle"));builder.SetFloat("_Threshold",displayTemplate.GetFloat("_Threshold"));
    builder.SetFloat("_Roughness",rough);builder.SetFloat("_MaxOffset",offset);builder.SetFloat("_Bowing",bow);builder.SetFloat("_Seed",displayTemplate.GetFloat("_Seed"));builder.SetFloat("_PenWidth",Mathf.Max(penWidth,2));builder.Dispatch(kernel,(rows+31)/32,1,1);
    target.sharedMaterial=displayTemplate;target.GetPropertyBlock(properties);properties.SetTexture("_SourceTex",coverage);properties.SetVector("_DesignSize",design);
    properties.SetVector("_AspectScale",displayTemplate.GetFloat("_PreserveAspect")>.5f?new Vector4(design.x/Mathf.Max(design.x,design.y),design.y/Mathf.Max(design.x,design.y),0,0):new Vector4(1,1,0,0));properties.SetTexture("_InputTex",input);properties.SetFloat("_InputPremultiplied",inputGenerator?0:(float)sourceAlphaMode);properties.SetFloat("_InputEncoding",inputGenerator?0:(float)sourceColorSpace);properties.SetFloat("_Seconds",Mathf.Max(0,seconds));properties.SetFloat("_BrushReady",1);properties.SetBuffer("_BrushData",brush);properties.SetBuffer("_BrushCounts",counts);properties.SetBuffer("_BrushDiagnostics",diagnostics);properties.SetFloat("_BrushFirstRow",firstRow);properties.SetFloat("_BrushLineCount",rows);properties.SetFloat("_BrushSpanCapacity",capacity);properties.SetFloat("_BrushRowRadius",radius);target.SetPropertyBlock(properties);
    LastRenderedSeconds=seconds;BuildCount++;lastHash=InputHash();dirty=false;Status="Ready; overflow is magenta. Call RequestDiagnostics explicitly for span count.";return true;
   }catch(Exception e){Status=e.Message;ReleaseTexture();ReleaseBrush();ReleaseProducer();Restore();lastHash=InputHash();dirty=false;return false;}
  }
  // Explicit, optional asynchronous diagnostic; never called by RenderAt/Update.
  public bool RequestDiagnostics(){
   if(diagnostics==null||diagnosticPending||!SystemInfo.supportsAsyncGPUReadback)return false;
   int version=epoch,limit=capacity;diagnosticPending=true;
   AsyncGPUReadback.Request(diagnostics,r=>{if(version!=epoch)return;diagnosticPending=false;if(r.hasError){Status="Diagnostic readback failed";return;}LastMaxSpans=(int)r.GetData<uint>()[0];Status=LastMaxSpans>limit?"GPU span capacity overflow: "+LastMaxSpans+" > "+limit:"Ready; max spans "+LastMaxSpans+" / "+limit;});return true;
  }
  void RenderProducer(float seconds){
   if(!inputGenerator.shader.isSupported)throw new InvalidOperationException("RGBA producer shader is unsupported");
   foreach(var name in producerFloatProperties)if(!Finite(inputGenerator.GetFloat(name)))throw new InvalidOperationException("Nonfinite producer parameter: "+name);
   foreach(var name in producerVectorProperties){var value=inputGenerator.GetVector(name);for(int i=0;i<4;i++)if(!Finite(value[i]))throw new InvalidOperationException("Nonfinite producer vector: "+name);}
   if(!SystemInfo.SupportsRenderTextureFormat(RenderTextureFormat.ARGBHalf))throw new InvalidOperationException("Generator RGBA input requires ARGBHalf");
   if(!Finite(generatorDesignSize.x)||!Finite(generatorDesignSize.y)||generatorDesignSize.x<=0||generatorDesignSize.y<=0)throw new InvalidOperationException("Invalid generator design size");
   float aspect=generatorDesignSize.x/generatorDesignSize.y;int longest=Mathf.Clamp(resolution,32,1024),w=aspect>=1?longest:Mathf.Max(1,Mathf.RoundToInt(longest*aspect)),h=aspect>=1?Mathf.Max(1,Mathf.RoundToInt(longest/aspect)):longest;
   if(!producer||producer.shader!=inputGenerator.shader){Dispose(producer);producer=new Material(inputGenerator){hideFlags=HideFlags.HideAndDontSave};}
   if(!producerTexture||producerTexture.width!=w||producerTexture.height!=h){ReleaseProducerTexture();producerTexture=new RenderTexture(w,h,0,RenderTextureFormat.ARGBHalf,RenderTextureReadWrite.Linear){hideFlags=HideFlags.HideAndDontSave,name="Handdrawn RGBA producer",wrapMode=TextureWrapMode.Clamp,filterMode=FilterMode.Bilinear};if(!producerTexture.Create())throw new InvalidOperationException("RGBA producer allocation failed");}
   producer.CopyPropertiesFromMaterial(inputGenerator);producer.SetFloat("_Seconds",Mathf.Max(0,seconds));var active=RenderTexture.active;bool srgb=GL.sRGBWrite;try{GL.sRGBWrite=false;Graphics.Blit(null,producerTexture,producer);}finally{RenderTexture.active=active;GL.sRGBWrite=srgb;}
  }
  void ReleaseProducerTexture(){if(producerTexture){producerTexture.Release();Dispose(producerTexture);producerTexture=null;}}
  void ReleaseProducer(){ReleaseProducerTexture();Dispose(producer);producer=null;}
  static bool Finite(float value)=>!float.IsNaN(value)&&!float.IsInfinity(value);
  void ReleaseBrush(){epoch++;diagnosticPending=false;brush?.Release();counts?.Release();diagnostics?.Release();brush=null;counts=null;diagnostics=null;rows=0;LastMaxSpans=0;}
  void ReleaseTexture(){if(coverage){coverage.Release();Dispose(coverage);coverage=null;}}
  void Restore(){if(hooked&&target){target.sharedMaterial=previous;target.SetPropertyBlock(previousProperties);}hooked=false;}
  void OnDisable(){
#if UNITY_EDITOR
   UnityEditor.EditorApplication.update-=EditorTick;
#endif
   ReleaseTexture();ReleaseBrush();ReleaseProducer();Restore();Dispose(generator);Dispose(builder);generator=null;builder=null;builderSource=null;}
  static void Dispose(UnityEngine.Object value){if(!value)return;if(Application.isPlaying)Destroy(value);else DestroyImmediate(value);}
 }
}
