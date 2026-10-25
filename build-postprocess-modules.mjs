import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import current from './web/engine-shader-runtime.js';
import {POST_EFFECTS} from './web/post-effect-specs.js';
import {FX_GLSL} from './web/post-fx.js';
import {ENGINE_SHADER_SCHEMA} from './web/engine-shader-contract.js';
import {POST_BINDINGS,postprocessShader,postprocessComponent} from './unity-postprocess-source.mjs';
import {writeEngineShaderRuntime,moduleReadme} from './write-engine-shader-runtime.mjs';
const out=resolve('test-results/engine-shaders');await mkdir(out,{recursive:true});
const fxc=process.env.TEXFORGE_FXC??'C:/Program Files (x86)/Windows Kits/10/bin/10.0.26100.0/x64/fxc.exe';
await access(fxc);
const runtime=await readFile('web/shaders/postprocess/MomoPostprocess.cs','utf8'),importer=await readFile('web/shaders/postprocess/PostprocessImporter.cs','utf8');
const effects={},rows=[];
const tidy=text=>text.replace(/[ \t]+$/gm,'').trimEnd()+'\n';
for(const spec of POST_EFFECTS){const binding=POST_BINDINGS[spec.id];if(!binding)continue;
 try{
  const full=postprocessShader(spec,binding),native=full.split('HLSLPROGRAM')[1].split('ENDHLSL')[0],program=native.replace(/^\s*#pragma[^\n]*$/gm,'').replace(/#include "Packages[^\n]+/,'float4 _Time;float4 TransformObjectToHClip(float3 p){return float4(p,1.);}')
  const test=resolve(out,spec.id+'-postprocess.hlsl');await writeFile(test,program);
  execFileSync(fxc,['/nologo','/Ges','/T','ps_5_0','/E','MF_Frag','/O3','/Fo',test+'.cso',test],{windowsHide:true,stdio:'pipe'});
  const component=postprocessComponent(spec,binding),folder='Unity/Postprocess/'+spec.id+'/',shaderFile=folder+'Effect.shader',hlslFile=folder+'Effect.hlsl';
  const parameters=spec.parameters.map(p=>({...p,variable:p.key,property:'_MF_'+p.key})),settings=Object.fromEntries(parameters.map(p=>[p.key,p.type==='color'?Object.fromEntries([1,3,5].map((k,i)=>[['x','y','z'][i],parseInt(p.default.slice(k,k+2),16)/255]).concat([['w',1]])):p.default]));
  const values=parameters.map(p=>({variable:p.key,type:p.type==='color'?'vector':p.type==='boolean'?'boolean':'number',number:p.type==='color'||p.type==='boolean'?0:p.default,boolean:p.type==='boolean'?p.default:false,vector:p.type==='color'?settings[p.key]:{x:0,y:0,z:0,w:0}}));
  const manifest={schema:'momo.postprocess-material/v1',componentType:'MomoTextureForge.Modules.'+component.name.slice(0,-3),shaderName:'Hidden/MomoTextureForge/Postprocess/'+spec.id,settings:JSON.stringify(settings),values,parameters};
  const files={[shaderFile]:full.replace(native,()=>`\n#pragma target 3.5\n#pragma vertex MF_Vert\n#pragma fragment MF_Frag\n#include "Effect.hlsl"\n`),[hlslFile]:native.replace(/^\s*#pragma[^\n]*$/gm,''),[folder+component.name]:component.text,[folder+'parameters.json']:JSON.stringify(manifest,null,2)+'\n','Unity/Shared/Runtime/MomoPostprocess.cs':runtime,'Unity/Shared/Editor/PostprocessImporter.cs':importer};
  files['README.md']='# Unity 后处理模块 · '+spec.id+'\n\n将 Unity 文件夹内容合并到 Assets/MomoTextureForge，保持 Shared 与 Postprocess 结构；多个模块共用同一份 Shared，勿复制为多份 C# 类。通过 Assets → Momo Texture Forge → Import postprocess module 导入本模块 parameters.json，创建带正式 Shader 引用的预制体；设置 input 为图片或实时 RT。完整参数、类型、范围与绑定见 module.json。可调用 Render(input, seconds) 显式更新；默认自动更新，时间为秒。\n\n输入可声明线性 RGB 与预乘状态；输出为预乘、数值 sRGB 的线性 ARGBHalf RT，与网页中间合成一致。链入下一模块时设置 inputIsLinear=false、inputIsPremultiplied=true。法线的 heightMode=0 用 alpha、1 用亮度、2 用显式 heightInput。半径使用 512 像素短边基准。禁用/销毁释放运行资源。目标 Unity 2022.3 / URP 14；HLSL 编译通过不代表目标引擎视觉验收。\n';
  files['README.en.md']='# Unity postprocess module · '+spec.id+'\n\nMerge Unity into Assets/MomoTextureForge, keeping Shared and Postprocess together. Multiple modules share one copy of Shared; do not duplicate C# classes. Use Assets → Momo Texture Forge → Import postprocess module with this module\'s parameters.json to create a prefab with a serialized Shader reference. Set input to an image or live RT. See module.json for all parameters/types/ranges/mappings. Render(input, seconds) updates explicitly; automatic updates are enabled by default. Time is seconds.\n\nDeclare input linear RGB and premultiplication. Output is premultiplied numeric sRGB in a linear ARGBHalf RT, matching editor intermediate composition. Chain using inputIsLinear=false and inputIsPremultiplied=true. Normal heightMode=0 reads alpha, 1 luminance, 2 explicit heightInput. Pixel radii use a 512-pixel short-edge design grid. Disable/destroy releases resources. Target Unity 2022.3 / URP 14. HLSL compilation does not establish target-engine visual acceptance.\n';
  files['README.md']=moduleReadme(files['README.md']);files['README.en.md']=moduleReadme(files['README.en.md']);
  files[shaderFile]=tidy(files[shaderFile]);files[hlslFile]=tidy(files[hlslFile]);
  files['Unity/Shared/NumericSRGBDisplay.shader']=await readFile('web/shaders/shared/NumericSRGBDisplay.shader','utf8');
  files['README.md']+='\n最终显示可创建 MomoTextureForge/Display/NumericSRGB 材质，将 _MainTex 设为组件 Output，用于透明 UV0 Mesh；该材质负责将数值 sRGB 输出转换为目标项目的显示颜色空间。\n';
  files['README.en.md']+='\nFor final transparent UV0 mesh display, create a MomoTextureForge/Display/NumericSRGB material and assign component Output to _MainTex. This material converts numeric-sRGB output into the target display color space.\n';
  files['README.md']+="\n自动更新读取 input；需要脚本完全控制 Render 调用顺序与时间时，先将组件 enabled=false，再调用公开 Render 方法；销毁仍会释放资源。\n";files['README.en.md']+="\nAutomatic updates read input. For fully scripted Render order/time, set the component enabled=false before calling the public Render method; destruction still releases resources.\n";
  files['README.md']+="\nRender 要求 GameObject 处于 activeInHierarchy；可禁用组件来手动更新，但不能在从未激活的对象上分配运行资源。未激活对象会在分配前明确报错。\n";files['README.en.md']+="\nRender requires an activeInHierarchy GameObject. Disable the component for manual updates, rather than allocating resources on a never-active object. Inactive calls fail before allocation.\n";
  const module={schema:ENGINE_SHADER_SCHEMA,id:'unity-postprocess-'+spec.id,kind:'postprocess',effectId:spec.id,sourceSignature:JSON.stringify({kernel:FX_GLSL,binding,parameters:spec.parameters,runtime}),target:{engine:'Unity',version:'2022.3',pipeline:'URP',pipelineVersion:'14'},shaderFile,hlslFile,parameters,manifestFile:folder+'parameters.json',verification:{hlslCompilation:'passed',engineCompilation:'not-run',engineVisualReview:'not-run'},files};
  effects[spec.id]=module;rows.push({id:spec.id,supported:true,parameters:parameters.length});
  const root=resolve('web/shaders/postprocess/modules',spec.id);await mkdir(root,{recursive:true});for(const [name,text]of Object.entries(files)){const path=resolve(root,name);await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,text);}const {files:_,...metadata}=module;await writeFile(resolve(root,'module.json'),JSON.stringify({...metadata,files:Object.keys(files)},null,2)+'\n');
 }catch(e){rows.push({id:spec.id,supported:false,reason:((e.stdout?.toString()??'')+(e.stderr?.toString()??'')||e.message).slice(0,1800)});}
}
await writeEngineShaderRuntime({graphics:current.graphics,effects});
await writeFile(resolve(out,'postprocess-build-report.json'),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({effects:Object.keys(effects),failed:rows.filter(r=>!r.supported)}));
