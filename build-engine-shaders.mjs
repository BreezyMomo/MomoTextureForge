// Maintained Unity sources are built/reviewed as a batch, never translated by a consuming AI.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {CATALOG} from './web/catalog.js';
import {project,node} from './web/tree-model.js';
import {builtinAsset} from './web/resource-assets.js';
import {ENGINE_SHADER_SCHEMA,graphicShaderSignature} from './web/engine-shader-contract.js';
import {compileProjectShader,REALTIME_SHADER_SCHEMA} from './web/project-shader-compiler.js';
import {shaderSource,importer} from './web/project-shader-package.js';
import current from './web/engine-shader-runtime.js';
import {writeEngineShaderRuntime,graphicModuleReadme,moduleNotices,graphicSharedFiles} from './write-engine-shader-runtime.mjs';

const output=resolve('test-results/engine-shaders'),fxc=process.env.TEXFORGE_FXC??'C:/Program Files (x86)/Windows Kits/10/bin/10.0.26100.0/x64/fxc.exe';
await mkdir(output,{recursive:true});
await access(fxc);
const shared=await graphicSharedFiles();
const graphics={},rows=[];
for(const graphic of CATALOG){
 const asset=builtinAsset(graphic.id),spec=asset.definition.generator;
 if(!process.argv.includes('--regenerate')){let prior;try{prior=JSON.parse(await readFile(resolve('web/shaders/graphics',graphic.id,'module.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}if(prior?.verification.engineCompilation==='failed'||prior?.verification.engineVisualReview==='failed'){rows.push({id:graphic.id,supported:false,reason:prior.verification.reason??'Target-engine verification failed; fix and explicitly regenerate before a new batch.'});continue;}}
 if(!process.argv.includes('--regenerate')&&asset.engineShaders?.unity){graphics[graphic.id]=asset.engineShaders.unity;rows.push({id:graphic.id,supported:true,existing:true});continue;}
 if(spec&&(spec.effect==='pipeline'?(spec.passes.length!==1||spec.passes[0].inputs.length):!['fire'].includes(spec.effect))){rows.push({id:graphic.id,supported:false,reason:'Requires a dedicated multi-pass or geometry runtime'});continue;}
 try{
  const p=project();p.root.id='shader-root';p.root.name='Graphic';p.name=graphic.id;
  const n=node('shape',graphic.id);n.id='shader-graphic';n.name=graphic.id;p.root.children=[n];
  const c=await compileProjectShader(p,{buildModules:true}),shader=shaderSource(c),hlsl=c.hlsl;
  const program=shader.split('HLSLPROGRAM')[1].split('ENDHLSL')[0].replace(/^\s*#pragma[^\n]*$/gm,'').replace(/#include "Packages[^\n]+/,'float4 TransformObjectToHClip(float3 p){return float4(p,1.);}\n#define CBUFFER_START(x) cbuffer x {\n#define CBUFFER_END }\nfloat4 _Time;').replace('#include "'+c.prefix+'.hlsl"',()=>hlsl);
  const test=resolve(output,graphic.id+'.hlsl');await writeFile(test,program);
  execFileSync(fxc,['/nologo','/Ges','/T','ps_5_0','/E','MF_Frag','/O3','/Fo',test+'.cso',test],{windowsHide:true,stdio:'pipe'});
  const parameters=asset.definition.parameters.map(s=>({...s,property:c.properties.find(p=>p.variable===s.variable).name}));
  const properties=c.properties.map(p=>({name:p.name,type:p.type,floatValue:p.type==='Float'?p.value:0,vectorValue:p.type==='Vector'?{x:p.value[0],y:p.value[1],z:p.value[2],w:p.value[3]}:{x:0,y:0,z:0,w:0}}));
  const manifest={schema:REALTIME_SHADER_SCHEMA,version:1,packageId:c.prefix,shaderName:'MomoTextureForge/Generated/'+c.prefix,materialProperties:properties,parameters};
  const files={['Unity/'+c.prefix+'.shader']:shader,['Unity/'+c.prefix+'.hlsl']:hlsl,['Unity/Editor/'+c.prefix+'Importer.cs']:importer(c),'Unity/parameters.json':JSON.stringify(manifest,null,2)+'\n','Reference/graphic.glsl':c.glslCore};
  files['README.md']='# '+graphic.id+' · Unity 图形模块\n\n将整个 Unity 文件夹复制到 Unity 2022.3 / URP 14 工程的 Assets 下。使用 Assets → Momo Texture Forge 菜单导入本包 parameters.json，或创建材质选择包内 Shader。图形参数映射见 module.json；参数以原生单位保存，时间为秒，透明区域不包含画布背景。源码与运行参数分开，分享资源时保留整个模块。\n\n支持透明无光照 Mesh、UV0。线性项目转换最终输出颜色；UI 遮罩、粒子专用输入需要目标工程适配。HLSL 编译通过不代表已经完成 Unity 视觉验收。\n';
  files['README.en.md']='# '+graphic.id+' · Unity graphic module\n\nCopy the complete Unity folder into Assets in Unity 2022.3 / URP 14. Use Assets → Momo Texture Forge to import this package\'s parameters.json, or create a material using its Shader. See module.json for native parameter mappings. Time is seconds; transparent output excludes the canvas background. Preserve the whole module when sharing.\n\nUnlit transparent mesh, UV0. Linear projects convert the final output color. UI stencil and particle-specific inputs need target adaptation. HLSL compilation does not establish Unity visual acceptance.\n';
  Object.assign(files,shared);files['README.md']=graphicModuleReadme(files['README.md']);files['README.en.md']=graphicModuleReadme(files['README.en.md'],true);
  files['Reference/NOTICE.txt']=moduleNotices(asset);
  const module={schema:ENGINE_SHADER_SCHEMA,id:'unity-graphic-'+graphic.id,kind:'graphic',graphicId:graphic.id,compositionContract:'momo.analytic-module/v1',sourceSignature:graphicShaderSignature(asset),target:c.support.target,shaderFile:'Unity/'+c.prefix+'.shader',hlslFile:'Unity/'+c.prefix+'.hlsl',parameters,verification:{hlslCompilation:'passed',engineCompilation:'not-run',engineVisualReview:'not-run'},files};
  const folder=resolve('web/shaders/graphics',graphic.id);await mkdir(folder,{recursive:true});
  for(const [name,text]of Object.entries(files)){const file=resolve(folder,name);await mkdir(resolve(file,'..'),{recursive:true});await writeFile(file,text);}
  const {files:_,...metadata}=module;await writeFile(resolve(folder,'module.json'),JSON.stringify({...metadata,files:Object.keys(files)},null,2)+'\n');
  graphics[graphic.id]=module;rows.push({id:graphic.id,supported:true,parameters:parameters.length});
 }catch(error){rows.push({id:graphic.id,supported:false,reason:((error.stdout?.toString()??'')+(error.stderr?.toString()??'')||error.message).slice(0,1600)});}
}
await writeEngineShaderRuntime({graphics,effects:current.effects??{}});
await writeFile(resolve(output,'build-report.json'),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({graphics:Object.keys(graphics).length,unsupported:rows.filter(r=>!r.supported).length,report:resolve(output,'build-report.json')}));
