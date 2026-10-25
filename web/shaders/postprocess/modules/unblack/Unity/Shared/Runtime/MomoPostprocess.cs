using UnityEngine;

namespace MomoTextureForge.Modules {
// Output uses premultiplied numeric sRGB RGBA in a linear RT, matching editor intermediates.
// Chain another module with inputIsLinear=false and inputIsPremultiplied=true.
[ExecuteAlways]
public abstract class MomoPostprocess:MonoBehaviour {
 public Texture input;
 public Texture heightInput;
 public Shader effectShader;
 public bool inputIsLinear=true;
 public bool inputIsPremultiplied=false;
 [Range(0,2)] public int heightMode=0;
 public bool automaticTime=true;
 public float seconds=0;
 public RenderTexture Output=>output;
 protected abstract string ShaderName {get;}
 protected abstract int Operation {get;}
 protected abstract int Pipeline {get;}
 protected abstract void Configure(Material value);
 Material material;
 RenderTexture output;
 protected virtual void LateUpdate(){if(input!=null)Render(input,automaticTime?(Application.isPlaying?Time.time:Time.realtimeSinceStartup):seconds);else ReleaseOutput();}
 public RenderTexture Render(Texture source,float elapsedSeconds){
  if(source==null){ReleaseOutput();return null;}
  if(!gameObject.activeInHierarchy)throw new System.InvalidOperationException("Render requires an active GameObject; disable the component for manual updates instead.");
  if(source==output)throw new System.InvalidOperationException("A postprocess cannot read and write its own output texture.");
  if(material==null){var shader=effectShader!=null?effectShader:Shader.Find(ShaderName);if(shader==null||!shader.isSupported)throw new System.InvalidOperationException("Missing/unsupported Shader: "+ShaderName);material=new Material(shader){hideFlags=HideFlags.HideAndDontSave};}
  if(output==null||output.width!=source.width||output.height!=source.height){ReleaseOutput();output=new RenderTexture(source.width,source.height,0,RenderTextureFormat.ARGBHalf,RenderTextureReadWrite.Linear){name=GetType().Name+" Output",hideFlags=HideFlags.HideAndDontSave,wrapMode=TextureWrapMode.Clamp,filterMode=FilterMode.Bilinear};output.Create();}
  Configure(material);material.SetFloat("_MF_UseExplicitTime",1);material.SetFloat("_MF_Seconds",elapsedSeconds);material.SetFloat("_MF_InputLinear",inputIsLinear?1:0);material.SetFloat("_MF_InputPremultiplied",inputIsPremultiplied?1:0);material.SetFloat("_MF_HeightMode",heightMode);material.SetTexture("_MF_HeightTex",heightInput??Texture2D.blackTexture);
  var oldActive=RenderTexture.active;bool oldSRGB=GL.sRGBWrite;GL.sRGBWrite=false;
  RenderTexture a=null,b=null,c=null;
  try{
   if(Pipeline==0){Pass(source,output,Operation,false,Vector2.zero);}
   else{
    a=Temporary(source);b=Temporary(source);
    if(Pipeline==1){Pass(source,a,10,false,Vector2.right);Pass(a,output,10,true,Vector2.up);}
    else{c=Temporary(source);Pass(source,a,11,false,Vector2.zero);Pass(a,b,10,true,Vector2.right);Pass(b,c,10,true,Vector2.up);material.SetTexture("_MF_OriginalTex",source);Pass(c,output,12,true,Vector2.zero);}
   }
   return output;
  }finally{material.SetTexture("_MF_OriginalTex",null);if(a!=null)RenderTexture.ReleaseTemporary(a);if(b!=null)RenderTexture.ReleaseTemporary(b);if(c!=null)RenderTexture.ReleaseTemporary(c);RenderTexture.active=oldActive;GL.sRGBWrite=oldSRGB;}
 }
 RenderTexture Temporary(Texture source){var rt=RenderTexture.GetTemporary(source.width,source.height,0,RenderTextureFormat.ARGBHalf,RenderTextureReadWrite.Linear);rt.wrapMode=TextureWrapMode.Clamp;rt.filterMode=FilterMode.Bilinear;return rt;}
 void Pass(Texture source,RenderTexture target,int operation,bool internalInput,Vector2 direction){material.SetInt("_MF_Operation",operation);material.SetFloat("_MF_InternalInput",internalInput?1:0);material.SetVector("_MF_BlurDirection",direction);Graphics.Blit(source,target,material);}
 void ReleaseOutput(){if(output==null)return;output.Release();if(Application.isPlaying)Destroy(output);else DestroyImmediate(output);output=null;}
 protected virtual void OnDisable(){ReleaseOutput();if(material!=null){if(Application.isPlaying)Destroy(material);else DestroyImmediate(material);material=null;}}
 protected virtual void OnDestroy(){OnDisable();}
}
}
