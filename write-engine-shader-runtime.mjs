import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {mkdir,readFile} from 'node:fs/promises';
import {writeGenerated as writeFile} from './tools/write-generated.mjs';
export function moduleReadme(text){if(text.includes('<!-- doc-language -->'))return text;const at=text.indexOf('\n');return text.slice(0,at)+'\n\n<!-- doc-language -->\n[简体中文](README.md) · [English](README.en.md)\n<!-- /doc-language -->'+text.slice(at);}
// Keep original attribution/license comments even when dependency extraction omits headers.
export function moduleNotices(asset){return Object.entries(asset.libraries).map(([name,source])=>{const comments=source.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g)??[];return comments.length?'=== '+name+' ===\n'+comments.join('\n'):'';}).filter(Boolean).join('\n\n')+'\n';}
export async function graphicSharedFiles(){return Object.fromEntries(await Promise.all(['MomoGraphicRenderer.cs','GraphicResolve.shader','NumericSRGBDisplay.shader'].map(async name=>['Unity/Shared/'+(name.endsWith('.cs')?'Runtime/':'')+name,await readFile('web/shaders/shared/'+name,'utf8')])));}
export function graphicModuleReadme(text,english=false){
 const setup=english?'Copy Unity files other than Shared into `Assets/MomoTextureForge/Graphics/<graphic-id>`. Merge Shared into Assets/MomoTextureForge/Shared once, sharing it across all graphic and postprocess modules.':'将 Unity 中除 Shared 外的文件放入 `Assets/MomoTextureForge/Graphics/<图形ID>`；Shared 合并到 Assets/MomoTextureForge/Shared，只保留一份，供图形与后处理共用。';
 text=text.replace('Copy the complete Unity folder into Assets in Unity 2022.3 / URP 14.',setup).replace('将整个 Unity 文件夹复制到 Unity 2022.3 / URP 14 工程的 Assets 下。',setup);
 if(!text.includes('MomoGraphicRenderer'))text+=english?'\nFor editor-matched raster filtering, assign the imported material to MomoGraphicRenderer.sourceMaterial and the GraphicResolve Shader to resolveShader. Render(material, seconds, width, height, 2) returns a premultiplied numeric-sRGB linear ARGBHalf RT. Connect postprocesses with inputIsLinear=false, inputIsPremultiplied=true. For final transparent UV0 mesh display use MomoTextureForge/Display/NumericSRGB, setting _MainTex to Output. Direct graphic materials remain available without an RT. Preserve one copy of each module/importer; replace or save another parameters.json for additional materials.\n':'\n需要匹配编辑器的栅格过滤时，将导入材质赋给 MomoGraphicRenderer.sourceMaterial，并将 GraphicResolve Shader 赋给 resolveShader。调用 Render(material, seconds, width, height, 2)，得到预乘、数值 sRGB 的线性 ARGBHalf RT；接后处理时使用 inputIsLinear=false、inputIsPremultiplied=true。最终显示用 MomoTextureForge/Display/NumericSRGB 材质，将 _MainTex 设为 Output，支持透明 UV0 Mesh。也可直接使用图形材质而不创建 RT。每种模块与导入器只保留一份；替换或另存 parameters.json 可导入更多材质。\n';
 const active=english?'Render requires an activeInHierarchy GameObject. Disable the component for manual updates; inactive calls fail before allocation.':'Render 要求 GameObject 处于 activeInHierarchy；手动更新可禁用组件，未激活对象的调用会在分配前报错。';if(!text.includes('activeInHierarchy'))text+='\n'+active+'\n';
 return moduleReadme(text);
}
export async function writeEngineShaderRuntime(value){
 await mkdir('web/vendor',{recursive:true});
 const vendor=await build({stdin:{contents:"import {gunzipSync,strFromU8} from 'fflate';export const decode=text=>JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(text),c=>c.charCodeAt(0)))));",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',minify:true});
 const license=await readFile('node_modules/fflate/LICENSE','utf8');
 await writeFile('web/vendor/engine-decompress.js','/*! fflate · MIT License\n'+license+'*/\n'+vendor.outputFiles[0].text);
 const bytes=gzipSync(JSON.stringify(value),{level:9});
 await writeFile('web/engine-shader-runtime.js',"// Generated engine modules; editable sources live in web/shaders.\nimport {decode} from './vendor/engine-decompress.js';\nexport default decode("+JSON.stringify(bytes.toString('base64'))+");\n");
}
