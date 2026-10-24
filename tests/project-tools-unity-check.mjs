// Optional real Unity probe, isolated under test-results; never opens the user's game project.
import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {resolve,relative,sep,dirname,basename} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {compareUnityReference} from './project-tools-unity-compare.mjs';
const flag=process.argv.indexOf('--unity'),unity=flag>=0?process.argv[flag+1]:null;
if(!unity)throw Error('Pass --unity <Unity 6 editor executable>; run project-tools-browser-check.mjs first');
await access(unity);
const unityVersion=basename(dirname(dirname(unity))),urpFlag=process.argv.indexOf('--urp'),urpDirectory=urpFlag>=0?resolve(process.argv[urpFlag+1]):resolve(dirname(unity),'Data/Resources/PackageManager/BuiltInPackages/com.unity.render-pipelines.universal'),urpPackage=JSON.parse(await readFile(resolve(urpDirectory,'package.json'),'utf8'));
const base=resolve('test-results/project-tools'),project=resolve(base,'unity-probe-'+unityVersion),marker=resolve(project,'.momo-forge-probe');
if(!project.startsWith(base+sep))throw Error('Probe must stay in test-results');
try{const files=await readdir(project);if(files.length)await access(marker);}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(resolve(project,'Assets/Editor'),{recursive:true});await mkdir(resolve(project,'Assets/Reference'),{recursive:true});await mkdir(resolve(project,'Packages'),{recursive:true});await mkdir(resolve(project,'ProjectSettings'),{recursive:true});await writeFile(marker,'Momo Texture Forge isolated shader probe\n');
await writeFile(resolve(project,'ProjectSettings/ProjectVersion.txt'),'m_EditorVersion: '+unityVersion+'\n');
const dependencies={'com.unity.render-pipelines.universal':urpPackage.version,'com.unity.modules.imageconversion':'1.0.0'};
if(urpFlag>=0){
 const cacheDirectory=dirname(urpDirectory),entries=await readdir(cacheDirectory),visited=new Set();
 async function localPackage(directory){const pkg=JSON.parse(await readFile(resolve(directory,'package.json'),'utf8'));if(visited.has(pkg.name))return;visited.add(pkg.name);dependencies[pkg.name]='file:'+directory.replaceAll('\\','/');
  for(const [name,version]of Object.entries(pkg.dependencies??{})){if(name.startsWith('com.unity.modules.')){dependencies[name]=version;continue;}const match=entries.find(entry=>entry===name+'@'+version)??entries.find(entry=>entry.startsWith(name+'@'));if(match)await localPackage(resolve(cacheDirectory,match));}
 }await localPackage(urpDirectory);
}
await writeFile(resolve(project,'Packages/manifest.json'),JSON.stringify({dependencies},null,2));
for(const name of ['parameters.json','mask.png','HanddrawnFillURP.shader','handdrawn-fill.hlsl'])await writeFile(resolve(project,'Assets/Reference',name),await readFile(resolve(base,'reference',name)));
await writeFile(resolve(project,'Assets/Editor/MomoHanddrawnImporter.cs'),await readFile('web/shaders/MomoHanddrawnImporter.cs'));
const probe=`using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEditor;
using UnityEditor.SceneManagement;
public static class MomoTextureForgeProbe {
 public static void Run() {
  try {
   var renderer=ScriptableObject.CreateInstance<UniversalRendererData>();AssetDatabase.CreateAsset(renderer,"Assets/Renderer.asset");
   var pipeline=UniversalRenderPipelineAsset.Create(renderer);AssetDatabase.CreateAsset(pipeline,"Assets/Pipeline.asset");
   GraphicsSettings.defaultRenderPipeline=pipeline;QualitySettings.renderPipeline=pipeline;PlayerSettings.colorSpace=ColorSpace.Linear;
   typeof(UniversalRenderPipelineAsset).Assembly.GetType("UnityEngine.Rendering.Universal.UniversalRenderPipelineGlobalSettings")?.GetMethod("Ensure",BindingFlags.Static|BindingFlags.NonPublic)?.Invoke(null,new object[]{true});
   AssetDatabase.SaveAssets();
   var material=MomoTextureForge.Editor.MomoHanddrawnImporter.Import(Path.Combine(Application.dataPath,"Reference/parameters.json"));
   var shader=material.shader;var messages=ShaderUtil.GetShaderMessages(shader);
   if(ShaderUtil.ShaderHasError(shader))throw new Exception(string.Join("\\n",messages.Select(m=>m.message)));
   var textureImporter=(TextureImporter)AssetImporter.GetAtPath("Assets/Reference/mask.png");
   if(textureImporter.sRGBTexture||textureImporter.mipmapEnabled||textureImporter.wrapMode!=TextureWrapMode.Clamp||textureImporter.textureCompression!=TextureImporterCompression.Uncompressed)throw new Exception("Incorrect mask import settings");
   if(Mathf.Abs(material.GetFloat("_Gap")-7.5f)>.001f||Mathf.Abs(material.GetFloat("_Style")-2)>.001f)throw new Exception("Material parameters lost");
   EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
   var go=new GameObject("Reference mesh");var mesh=new Mesh();mesh.vertices=new[]{new Vector3(-.75f,-.5f,0),new Vector3(.75f,-.5f,0),new Vector3(.75f,.5f,0),new Vector3(-.75f,.5f,0)};mesh.uv=new[]{new Vector2(0,0),new Vector2(1,0),new Vector2(1,1),new Vector2(0,1)};mesh.triangles=new[]{0,1,2,0,2,3};go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=material;
   var camera=new GameObject("Reference camera").AddComponent<Camera>();camera.transform.position=new Vector3(0,0,-2);camera.orthographic=true;camera.orthographicSize=.5f;camera.aspect=512f/341f;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=Color.clear;camera.GetUniversalAdditionalCameraData().renderPostProcessing=false;
   var target=new RenderTexture(512,341,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);target.Create();
   camera.targetTexture=target;
   RenderPipeline.SubmitRenderRequest(camera,new UniversalRenderPipeline.SingleCameraRequest{destination=target});
   RenderTexture.active=target;var image=new Texture2D(512,341,TextureFormat.RGBA32,false);image.ReadPixels(new Rect(0,0,512,341),0,0);image.Apply();
   File.WriteAllBytes(Path.Combine(Application.dataPath,"../../unity-reference.png"),image.EncodeToPNG());
   if(!image.GetPixels32().Any(c=>c.a>0&&c.r>20))throw new Exception("Engine output is empty");
   EditorSceneManager.SaveScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene(),"Assets/ReferenceComparison.unity");
   File.WriteAllText(Path.Combine(Application.dataPath,"../../unity-validation.json"),"{\\"engineCompilation\\":\\"passed\\",\\"materialImport\\":\\"passed\\",\\"rendered\\":true,\\"unity\\":\\""+Application.unityVersion+"\\",\\"pipeline\\":\\"URP 17.3.0\\",\\"colorSpace\\":\\"Linear\\"}");
   Debug.Log("MOMO_PROJECT_TOOLS_UNITY_PASSED");
  }catch(Exception error){Debug.LogException(error);EditorApplication.Exit(1);}
 }
}`;
await writeFile(resolve(project,'Assets/Editor/MomoTextureForgeProbe.cs'),probe);
const log=resolve(base,'unity-probe.log');
const cache=resolve(base,'upm-cache');await mkdir(cache,{recursive:true});
await writeFile(resolve(base,'unity-validation.json'),JSON.stringify({engineCompilation:'not-run',status:'running'}));
try{await promisify(execFile)(unity,['-batchmode','-force-d3d11','-projectPath',project,'-executeMethod','MomoTextureForgeProbe.Run','-quit','-logFile',log],{timeout:300000,windowsHide:true,maxBuffer:1024*1024,env:{...process.env,ALLUSERSPROFILE:process.env.ALLUSERSPROFILE??process.env.ProgramData??'C:\\ProgramData',HOME:process.env.HOME??process.env.USERPROFILE,UPM_CACHE_ROOT:cache,UPM_NPM_CACHE_PATH:resolve(cache,'npm'),UPM_CACHE_PATH:resolve(cache,'packages')}});}catch(error){console.error((await readFile(log,'utf8').catch(()=>error.message)).split('\n').filter(line=>/error|exception|failed|undefined|passed/i.test(line)).slice(-25).join('\n'));throw error;}
const result=await compareUnityReference(base);console.log(JSON.stringify({...result,project:relative(resolve('.'),project),log}));
