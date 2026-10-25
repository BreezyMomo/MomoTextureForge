using UnityEngine;
namespace MomoTextureForge.Modules {
// Optional raster adapter for the editor's supersampled numeric-sRGB composition.
[ExecuteAlways] public sealed class MomoGraphicRenderer:MonoBehaviour {
 public Material sourceMaterial;
 public Shader resolveShader;
 [Range(1,4096)] public int width=512,height=512;
 [Range(1,4)] public int supersampling=2;
 public bool automaticUpdate=true,automaticTime=true;
 public float seconds;
 public RenderTexture Output=>output;
 Material graphic,resolve;
 RenderTexture high,output;
 void LateUpdate(){if(automaticUpdate){if(sourceMaterial!=null)Render(sourceMaterial,automaticTime?(Application.isPlaying?Time.time:Time.realtimeSinceStartup):seconds,width,height,supersampling);else Release();}}
 public RenderTexture Render(Material source,float elapsedSeconds,int w,int h,int samples=2){
  if(source==null){Release();return null;}
  if(!gameObject.activeInHierarchy)throw new System.InvalidOperationException("Render requires an active GameObject; disable the component for manual updates instead.");
  samples=Mathf.Clamp(samples,1,4);
  if(w<1||h<1||w>SystemInfo.maxTextureSize/samples||h>SystemInfo.maxTextureSize/samples)throw new System.ArgumentOutOfRangeException("Graphic render dimensions");
  if(!source.HasProperty("_MF_UseExplicitTime")||!source.HasProperty("_MF_Seconds"))throw new System.InvalidOperationException("Use a standard Texture Forge graphic material");
  if(graphic==null||graphic.shader!=source.shader){DestroyMaterial(ref graphic);graphic=new Material(source){hideFlags=HideFlags.HideAndDontSave};}
  graphic.CopyPropertiesFromMaterial(source);graphic.SetFloat("_MF_UseExplicitTime",1);graphic.SetFloat("_MF_Seconds",elapsedSeconds);
  if(resolve==null){if(resolveShader==null)resolveShader=Shader.Find("Hidden/MomoTextureForge/GraphicResolve");if(resolveShader==null)throw new System.InvalidOperationException("Missing GraphicResolve Shader");resolve=new Material(resolveShader){hideFlags=HideFlags.HideAndDontSave};}
  if(high==null||high.width!=w*samples||high.height!=h*samples||output==null||output.width!=w||output.height!=h){ReleaseTextures();high=Target(w*samples,h*samples,"Graphic samples");output=Target(w,h,"Graphic output");}
  var active=RenderTexture.active;bool srgb=GL.sRGBWrite;
  try{GL.sRGBWrite=false;RenderTexture.active=high;GL.Clear(false,true,Color.clear);Graphics.Blit(Texture2D.blackTexture,high,graphic,0);resolve.SetFloat("_MF_Samples",samples);resolve.SetFloat("_MF_SourceLinear",QualitySettings.activeColorSpace==ColorSpace.Linear?1:0);Graphics.Blit(high,output,resolve,0);return output;}
  finally{RenderTexture.active=active;GL.sRGBWrite=srgb;}
 }
 RenderTexture Target(int w,int h,string name){var rt=new RenderTexture(w,h,0,RenderTextureFormat.ARGBHalf,RenderTextureReadWrite.Linear){name=name,hideFlags=HideFlags.HideAndDontSave,filterMode=FilterMode.Point,wrapMode=TextureWrapMode.Clamp};rt.Create();return rt;}
 void ReleaseTextures(){DestroyTexture(ref high);DestroyTexture(ref output);}
 void DestroyTexture(ref RenderTexture rt){if(rt==null)return;rt.Release();if(Application.isPlaying)Destroy(rt);else DestroyImmediate(rt);rt=null;}
 void DestroyMaterial(ref Material material){if(material==null)return;if(Application.isPlaying)Destroy(material);else DestroyImmediate(material);material=null;}
 void Release(){ReleaseTextures();DestroyMaterial(ref graphic);DestroyMaterial(ref resolve);}
 void OnDisable(){Release();}
 void OnDestroy(){Release();}
}
}
