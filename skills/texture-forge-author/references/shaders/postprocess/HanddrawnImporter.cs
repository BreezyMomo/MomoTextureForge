#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEngine;
namespace __NAMESPACE__ {
 public static class Importer {
  [Serializable] class Property{public string name,type;public float floatValue;public Vector4 vectorValue;}
  [Serializable] class Integrity{public string file,sha256;}
  [Serializable] class Files{public string coverageShader,displayShader,compute,input,producerShader;}
  [Serializable] class Runtime{public int resolution,spanCapacity,designShortSide,sourceAlphaMode,sourceColorSpace;public string type;}
  [Serializable] class Geometry{public float[] designSize;}
  [Serializable] class Manifest{public string schema,packageId,mode,coverageShaderName,displayShaderName,producerShaderName;public int version;public Files files;public Runtime runtime;public Geometry geometry;public Property[] sourceMaterialProperties,displayMaterialProperties;public Integrity[] integrity;}
  [MenuItem("Assets/Momo Texture Forge/Import handdrawn postprocess __ID__")]
  public static void Import(){string file=EditorUtility.OpenFilePanel("Handdrawn postprocess parameters",Application.dataPath,"json");if(!string.IsNullOrEmpty(file))ImportFile(file);}
  public static string ImportFile(string path){
   var m=JsonUtility.FromJson<Manifest>(File.ReadAllText(path));
   if(m==null||m.schema!="momo.handdrawn-postprocess/v1"||m.version!=1||m.packageId!="__ID__"||m.mode!="postprocess"||m.files==null||m.runtime==null||m.runtime.type!="__NAMESPACE__.HanddrawnEffect"||m.geometry?.designSize?.Length!=2||m.displayMaterialProperties==null||m.sourceMaterialProperties==null||m.integrity==null)throw new InvalidOperationException("Invalid unified handdrawn package; retired reference formats are not exported");
   if(!SystemInfo.supportsComputeShaders||SystemInfo.graphicsShaderLevel<45||!SystemInfo.SupportsRenderTextureFormat(RenderTextureFormat.RFloat))throw new InvalidOperationException("Handdrawn postprocess requires Compute/SM4.5/RFloat");
   string directory=Path.GetDirectoryName(Path.GetFullPath(path)),assets=Path.GetFullPath(Application.dataPath)+Path.DirectorySeparatorChar;if(!directory.StartsWith(assets,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Copy the complete Unity folder below Assets first");string root=directory+Path.DirectorySeparatorChar;
   var names=new System.Collections.Generic.HashSet<string>();foreach(var entry in m.integrity){if(entry==null||entry.file==null||!entry.file.StartsWith("Unity/",StringComparison.Ordinal)||!names.Add(entry.file))throw new InvalidOperationException("Invalid integrity list");string file=Path.GetFullPath(Path.Combine(root,entry.file.Substring(6)));if(!file.StartsWith(root,StringComparison.OrdinalIgnoreCase)||!File.Exists(file))throw new InvalidOperationException("Missing package file: "+entry.file);using(var sha=SHA256.Create())if(BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(file))).Replace("-","").ToLowerInvariant()!=entry.sha256)throw new InvalidOperationException("Package integrity mismatch: "+entry.file);}
   foreach(string file in new[]{m.files.coverageShader,m.files.displayShader,m.files.compute,m.files.input,"HanddrawnEffect.cs","handdrawn-input.hlsl","hatch-brush.hlsl","ROUGH-LICENSE.txt","Editor/__ID__Importer.cs"})if(!names.Contains("Unity/"+file))throw new InvalidOperationException("Missing required integrity record: "+file);
   Func<string,string> assetPath=file=>"Assets/"+Path.GetFullPath(Path.Combine(directory,file)).Substring(assets.Length).Replace('\\','/');
   Shader coverage=AssetDatabase.LoadAssetAtPath<Shader>(assetPath(m.files.coverageShader)),display=AssetDatabase.LoadAssetAtPath<Shader>(assetPath(m.files.displayShader));var compute=AssetDatabase.LoadAssetAtPath<ComputeShader>(assetPath(m.files.compute));Check(coverage,m.coverageShaderName);Check(display,m.displayShaderName);if(!compute||!compute.HasKernel("BuildHatch")||!compute.HasKernel("ClearDiagnostics"))throw new InvalidOperationException("Handdrawn compute failed import");
   if(m.runtime.resolution<32||m.runtime.resolution>1024||m.runtime.spanCapacity<1||m.runtime.spanCapacity>128||m.runtime.designShortSide!=512)throw new InvalidOperationException("Invalid resource/design contract");
   string texturePath=assetPath(m.files.input);var importer=AssetImporter.GetAtPath(texturePath) as TextureImporter;if(importer==null)throw new InvalidOperationException("Missing RGBA input texture");importer.textureType=TextureImporterType.Default;importer.sRGBTexture=true;importer.alphaIsTransparency=false;importer.alphaSource=TextureImporterAlphaSource.FromInput;importer.mipmapEnabled=false;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.npotScale=TextureImporterNPOTScale.None;importer.wrapMode=TextureWrapMode.Clamp;importer.filterMode=FilterMode.Bilinear;importer.GetSourceTextureWidthAndHeight(out int width,out int height);importer.maxTextureSize=Mathf.Clamp(Mathf.NextPowerOfTwo(Mathf.Max(width,height)),32,16384);importer.SaveAndReimport();var input=AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath);if(!input||input.width!=width||input.height!=height)throw new InvalidOperationException("Input import resized the RGBA stage; check platform overrides");
   Material effectMaterial=new Material(display),producerMaterial=null;GameObject quad=null;string output=assetPath("Imported-__ID__");bool created=false;
   if(Directory.Exists(Path.Combine(directory,"Imported-__ID__")))throw new InvalidOperationException("Import destination exists; use its existing Prefab or a new asset folder");
   try{
    Apply(effectMaterial,m.displayMaterialProperties);effectMaterial.SetTexture("_InputTex",input);
    if(!string.IsNullOrEmpty(m.files.producerShader)){if(!names.Contains("Unity/"+m.files.producerShader)||!names.Contains("Unity/__ID__Producer.hlsl"))throw new InvalidOperationException("Missing reviewed RGBA producer files");var shader=AssetDatabase.LoadAssetAtPath<Shader>(assetPath(m.files.producerShader));Check(shader,m.producerShaderName);producerMaterial=new Material(shader);Apply(producerMaterial,m.sourceMaterialProperties);}
    quad=GameObject.CreatePrimitive(PrimitiveType.Quad);quad.name="Handdrawn postprocess __ID__";UnityEngine.Object.DestroyImmediate(quad.GetComponent<Collider>());
    var effect=quad.AddComponent<HanddrawnEffect>();effect.displayTemplate=effectMaterial;effect.inputGenerator=producerMaterial;effect.coverageShader=coverage;effect.hatchBuilder=compute;effect.resolution=m.runtime.resolution;effect.spanCapacity=m.runtime.spanCapacity;effect.designShortSide=m.runtime.designShortSide;effect.sourceAlphaMode=(HanddrawnEffect.SourceAlphaMode)m.runtime.sourceAlphaMode;effect.sourceColorSpace=(HanddrawnEffect.SourceColorSpace)m.runtime.sourceColorSpace;
    effect.capturedDesignSize=new Vector2(m.geometry.designSize[0],m.geometry.designSize[1]);effect.initialInputTexture=input;effect.initialInputWidth=input.width;effect.initialInputHeight=input.height;effect.generatorDesignSize=effect.capturedDesignSize;effect.producerFloatProperties=m.sourceMaterialProperties.Where(p=>p.type=="Float").Select(p=>p.name).ToArray();effect.producerVectorProperties=m.sourceMaterialProperties.Where(p=>p.type=="Vector").Select(p=>p.name).ToArray();
    if(!effect.RenderAt(0))throw new InvalidOperationException(effect.Status);effect.enabled=false;
    Directory.CreateDirectory(Path.Combine(directory,"Imported-__ID__"));AssetDatabase.Refresh();created=true;AssetDatabase.CreateAsset(effectMaterial,output+"/Handdrawn.mat");if(producerMaterial)AssetDatabase.CreateAsset(producerMaterial,output+"/InputProducer.mat");quad.GetComponent<MeshRenderer>().sharedMaterial=effectMaterial;effect.enabled=true;
    string prefab=output+"/Handdrawn.prefab";PrefabUtility.SaveAsPrefabAsset(quad,prefab);AssetDatabase.SaveAssets();Selection.activeObject=AssetDatabase.LoadAssetAtPath<GameObject>(prefab);return prefab;
   }catch{if(created)AssetDatabase.DeleteAsset(output);throw;}
   finally{if(quad)UnityEngine.Object.DestroyImmediate(quad);if(effectMaterial&&!EditorUtility.IsPersistent(effectMaterial))UnityEngine.Object.DestroyImmediate(effectMaterial);if(producerMaterial&&!EditorUtility.IsPersistent(producerMaterial))UnityEngine.Object.DestroyImmediate(producerMaterial);}
  }
  static void Check(Shader shader,string name){if(!shader||shader.name!=name||ShaderUtil.ShaderHasError(shader)||!shader.isSupported)throw new InvalidOperationException("Required shader failed compilation: "+name);}
  static void Apply(Material material,Property[] values){foreach(var p in values){if(p==null||!material.HasProperty(p.name))throw new InvalidOperationException("Unknown mapped material property: "+p?.name);if(p.type=="Float"){if(float.IsNaN(p.floatValue)||float.IsInfinity(p.floatValue))throw new InvalidOperationException("Nonfinite material value");material.SetFloat(p.name,p.floatValue);}else if(p.type=="Color")material.SetColor(p.name,new Color(p.vectorValue.x,p.vectorValue.y,p.vectorValue.z,p.vectorValue.w));else if(p.type=="Vector")material.SetVector(p.name,p.vectorValue);else throw new InvalidOperationException("Unknown material mapping type");}}
 }
}
#endif
