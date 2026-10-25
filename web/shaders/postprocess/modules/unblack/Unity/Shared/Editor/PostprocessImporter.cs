#if UNITY_EDITOR
using System;
using System.IO;
using UnityEngine;
using UnityEditor;
namespace MomoTextureForge.Modules.Editor {
public static class PostprocessImporter {
 [Serializable] class Value {public string variable,type;public float number;public bool boolean;public Vector4 vector;}
 [Serializable] class Manifest {public string schema;public string componentType;public string shaderName;public string settings;public Value[] values;}
 [MenuItem("Assets/Momo Texture Forge/Import postprocess module")]
 public static void Import(){var path=EditorUtility.OpenFilePanel("Select module parameters.json",Application.dataPath,"json");if(!String.IsNullOrEmpty(path))ImportFile(path);}
 public static GameObject ImportFile(string path){
  var full=Path.GetFullPath(path);var assets=Path.GetFullPath(Application.dataPath)+Path.DirectorySeparatorChar;
  if(!full.StartsWith(assets,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Copy the complete Unity folder into Assets/MomoTextureForge first.");
  var data=JsonUtility.FromJson<Manifest>(File.ReadAllText(full));if(data==null||data.schema!="momo.postprocess-material/v1")throw new InvalidOperationException("Wrong postprocess manifest");
  Type type=null;foreach(var a in AppDomain.CurrentDomain.GetAssemblies()){type=a.GetType(data.componentType,false);if(type!=null)break;}
  if(type==null||!typeof(MomoPostprocess).IsAssignableFrom(type))throw new InvalidOperationException("Missing postprocess component");
  var shader=Shader.Find(data.shaderName);if(shader==null||ShaderUtil.ShaderHasError(shader))throw new InvalidOperationException("Shader is missing or failed compilation");
  var go=new GameObject(type.Name);try{var component=(MomoPostprocess)go.AddComponent(type);
   if(data.values==null)JsonUtility.FromJsonOverwrite(data.settings,component);
   else foreach(var value in data.values){var field=type.GetField(value.variable,System.Reflection.BindingFlags.Public|System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.DeclaredOnly);if(field==null)throw new InvalidOperationException("Unknown native parameter: "+value.variable);if(field.FieldType==typeof(float)&&value.type=="number")field.SetValue(component,value.number);else if(field.FieldType==typeof(bool)&&value.type=="boolean")field.SetValue(component,value.boolean);else if(field.FieldType==typeof(Vector4)&&value.type=="vector")field.SetValue(component,value.vector);else throw new InvalidOperationException("Wrong native parameter type: "+value.variable);}
   component.effectShader=shader;EditorUtility.SetDirty(component);var folder=Path.GetDirectoryName(full);var relative="Assets/"+Path.GetRelativePath(Application.dataPath,folder).Replace('\\','/');var output=AssetDatabase.GenerateUniqueAssetPath(relative+"/"+type.Name+".prefab");var prefab=PrefabUtility.SaveAsPrefabAsset(go,output);AssetDatabase.SaveAssets();return prefab;}finally{UnityEngine.Object.DestroyImmediate(go);}
 }
}
}
#endif
