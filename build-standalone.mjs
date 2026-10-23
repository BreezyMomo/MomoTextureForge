import {validateUICatalogs} from './tools/i18n-audit.mjs';
import {buildAuthoringKit} from './build-authoring-kit.mjs';
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve,dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {build} from "esbuild";
import {loadDefinitionURL} from "./web/definition-loader.js";
import {encodeZIP} from "./web/encoders.js";

const toolRoot=dirname(fileURLToPath(import.meta.url)),webRoot=join(toolRoot,"web");
const args=process.argv.slice(2);
if(args.length>1)throw new Error("Usage: node build-standalone.mjs [output-directory]");
const output=resolve(args[0]||join(toolRoot,"dist"));
await validateUICatalogs();
await buildAuthoringKit();
// Keep the support dialog offline-ready, using the same original as the docs.
const appreciationCode=await readFile(join(toolRoot,'docs/images/wechat-appreciation.png'));
await writeFile(join(webRoot,'appreciation-code.js'),'// Generated from docs/images/wechat-appreciation.png by build-standalone.mjs.\nexport default '+JSON.stringify('data:image/png;base64,'+appreciationCode.toString('base64'))+';\n');
const registry=await loadDefinitionURL(new URL("./web/definitions/builtin.json",import.meta.url));
const read=name=>readFile(join(webRoot,name),"utf8");
const [indexHTML,examplesHTML,validationHTML,css]=await Promise.all([read("index.html"),read("examples.html"),read("validate.html"),Promise.all([read("theme-tokens.css"),read("style.css"),read("tree.css"),read("graphics-workspace.css"),read("dock-workspace.css"),read("inspector-color.css"),read("editor-surfaces.css"),read("creative-skins.css"),read("tab-styles.css"),read("palette-roles.css"),read("workspace-workflow.css")]).then(parts=>parts.join("\n"))]);
const body=html=>{
  const content=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if(!content)throw new Error("Page body missing");
  return content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/^[\t ]+$/gm,"");
};
const examplesStyle=examplesHTML.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
if(!examplesStyle)throw new Error("Examples style missing");
const serialize=value=>JSON.stringify(value).replaceAll("<","\\u003c");
const runtime=`const freeze=(value)=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};export const BUILTIN=freeze(${serialize(registry)});export const formulaText=spec=>spec.inline??BUILTIN.sources[spec.file];`;
const entry=`
import './appearance.js';
import {startupStage,mountStartupContent,completeStartup,failStartup} from './startup.js';
import {uiText} from './ui-language.js';
(async()=>{
  const view=new URLSearchParams(location.search).get('view')||'editor';
  try {
    if(view==='examples'){
      await startupStage(uiText('startup.preparingExamples'));
      document.querySelector('title').dataset.i18n='ui.momoTextureForgeExamples';document.title=uiText('ui.momoTextureForgeExamples');
      mountStartupContent(${serialize(body(examplesHTML))});
      const style=document.createElement('style');style.textContent=${serialize(examplesStyle)};document.head.append(style);
      await import('./examples.js');
    }else if(view==='validate'){
      await startupStage(uiText('startup.preparingValidation'));
      document.querySelector('title').dataset.i18n='ui.momoTextureForgeValidation';document.title=uiText('ui.momoTextureForgeValidation');
      mountStartupContent(${serialize(body(validationHTML))});
      document.body.style.cssText='padding:24px;max-width:900px;margin:auto';
      await import('./validate.js');
    }else{
      await startupStage(uiText('ui.readingGraphicsAndLocalResources'));
      const treeStyle=document.createElement('style');treeStyle.dataset.treeStyle='true';document.head.append(treeStyle);const {restoreAssets}=await import('./resource-assets.js');await restoreAssets();
      await startupStage(uiText('ui.preparingEditor'));await (await import('./tree-app.js')).ready;
    }
    await completeStartup();
  }catch(error){
    failStartup(error);console.error(error);
  }
})();`;
const workerBuild=await build({entryPoints:[join(webRoot,'export-worker.js')],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true,plugins:[{name:'worker-definitions',setup(plugin){plugin.onLoad({filter:/[\\/]definition-runtime\.js$/},()=>({contents:runtime,loader:'js',resolveDir:webRoot}));}}]});
const workerSource=workerBuild.outputFiles[0].text;
const result=await build({stdin:{contents:entry,resolveDir:webRoot,sourcefile:"standalone-entry.js",loader:"js"},bundle:true,write:false,format:"iife",platform:"browser",target:"es2022",minify:true,charset:"utf8",legalComments:"inline",metafile:true,plugins:[{name:"embedded-definitions",setup(plugin){plugin.onLoad({filter:/[\\/]export-worker-source\.js$/},()=>({contents:"export default "+serialize(workerSource),loader:"js"}));plugin.onLoad({filter:/[\\/]definition-runtime\.js$/},()=>({contents:runtime,loader:"js",resolveDir:webRoot}));}}]});
const javascript=result.outputFiles[0].text;
const psdLicenses=await read('vendor/PSD-LICENSES.txt');
if(Object.values(result.metafile.outputs).some(file=>file.imports.length))throw new Error("Standalone bundle still has external imports");
if(Object.keys(result.metafile.inputs).some(file=>/[\\/]definition-loader\.js$/.test(file)))throw new Error("Standalone contains a runtime file loader");
if(/<\/script/i.test(javascript))throw new Error("Unsafe inline script terminator");
if(/<\/style/i.test(css))throw new Error("Unsafe inline style terminator");
const policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob: https: http:; connect-src https: http:; worker-src blob:; object-src 'none'; base-uri 'none'";
let html=indexHTML.replace('<html lang="zh-CN">','<html lang="zh-CN" data-distribution="standalone">')
  .replace('<link rel="stylesheet" href="theme-tokens.css" />','')
  .replace('<link rel="stylesheet" href="style.css" />',()=>`<meta http-equiv="Content-Security-Policy" content="${policy}"><style>${css}</style>`)
  .replace('<script type="module" src="bootstrap.js"></script>',()=>`<script>${javascript}</script>`)
  .replace('分享链接只编码贴图参数，不上传；接收方使用自己运行的工具地址，保留 #fx= 后的部分。','离线版通过“导出配置”下载项目 ZIP；把项目与本 HTML 一起发送，接收方点“打开项目”恢复。草稿按浏览器和文件位置保存，重要项目请保存为 ZIP。');
if(html.includes('src="bootstrap.js"')||html.includes('href="style.css"'))throw new Error("External HTML assets remain");
html='<!--\n'+psdLicenses.replaceAll('--','—')+'\n-->\n'+html;
await mkdir(output,{recursive:true});
const name="MomoTextureForge.html";
const instructions="Momo Texture Forge 离线版\r\n\r\n双击 MomoTextureForge.html，用支持 WebGL2 的 Chrome 或 Edge 打开。\r\n无需安装 Node 或运行服务器；本地功能可离线使用，远程图库订阅需要联网并由服务器允许跨域。\r\n图形示例会打开本文件的示例视图，点击编辑可继续调整。\r\n保存项目使用 ZIP（打开兼容旧 JSON）；需要分享作品时点“保存项目”，将节点树项目 ZIP 与 HTML 一起发送。\r\n草稿与自建预设由浏览器保存，移动 HTML 或更换浏览器后可能不共享；重要项目请另存为 ZIP。\r\nPNG、EXR、图集、逐帧和批量文件会下载到浏览器默认下载目录。\r\n";
await writeFile(join(output,name),html);
await writeFile(join(output,"使用说明.txt"),instructions);
await writeFile(join(output,"MomoTextureForge-offline.zip"),encodeZIP([{name,data:new TextEncoder().encode(html)},{name:"使用说明.txt",data:new TextEncoder().encode(instructions)},{name:'PSD-LICENSES.txt',data:new TextEncoder().encode(psdLicenses)}]));
const report={schema:"momo-texture-standalone-build/v1",patterns:registry.catalog.length,configurationFiles:registry.configFiles.length,sourceFiles:Object.keys(registry.sources).length,bytes:Buffer.byteLength(html),sha256:createHash("sha256").update(html).digest("hex"),externalImports:0,network:"HTTP(S) remote subscriptions only; offline without subscriptions",views:["editor","examples","validate"]};
await writeFile(join(output,"build-report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,file:join(output,name)},null,2));
