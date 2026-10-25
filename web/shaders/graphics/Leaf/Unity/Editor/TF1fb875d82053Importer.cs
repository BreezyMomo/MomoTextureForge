#if UNITY_EDITOR
using System;using System.IO;using UnityEditor;using UnityEngine;
namespace MomoTextureForge.Exported.TF1fb875d82053 {
public static class MaterialImporter {
 [Serializable] class Value {public string name;public string type;public float floatValue;public Vector4 vectorValue;}
 [Serializable] class Manifest {public string schema;public string shaderName;public Value[] materialProperties;}
 [MenuItem("Assets/Momo Texture Forge/Import TF1fb875d82053 material")]
 public static void Import(){var path=EditorUtility.OpenFilePanel("Select parameters.json inside the exported Unity folder",Application.dataPath,"json");if(!String.IsNullOrEmpty(path))ImportFile(path);}
 public static Material ImportFile(string path){
  var pipeline=UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline;
  if(pipeline==null||pipeline.GetType().FullName!="UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset")throw new InvalidOperationException("Activate a URP pipeline asset before importing this material.");
  var full=Path.GetFullPath(path);var folder=Path.GetDirectoryName(full);var assets=Path.GetFullPath(Application.dataPath)+Path.DirectorySeparatorChar;
  if(!full.StartsWith(assets,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Copy the entire exported Unity folder inside Assets first.");
  var data=JsonUtility.FromJson<Manifest>(File.ReadAllText(full));
  if(data==null||data.schema!="momo.realtime-shader/v1"||data.shaderName!="MomoTextureForge/Generated/TF1fb875d82053")throw new InvalidOperationException("Wrong shader manifest.");
  AssetDatabase.Refresh();var shader=Shader.Find(data.shaderName);if(shader==null||ShaderUtil.ShaderHasError(shader))throw new InvalidOperationException("Shader missing or has compilation errors. Check the Console and active URP pipeline.");
  var material=new Material(shader);foreach(var value in data.materialProperties){if(!material.HasProperty(value.name))throw new InvalidOperationException("Missing material property: "+value.name);if(value.type=="Vector")material.SetVector(value.name,value.vectorValue);else material.SetFloat(value.name,value.floatValue);}
  var output=AssetDatabase.GenerateUniqueAssetPath("Assets/"+Path.GetRelativePath(Application.dataPath,folder).Replace('\\','/')+"/TF1fb875d82053.mat");AssetDatabase.CreateAsset(material,output);AssetDatabase.SaveAssets();Selection.activeObject=material;return material;
 }
}}
#endif
