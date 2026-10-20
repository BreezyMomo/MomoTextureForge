import {build} from 'esbuild';
import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadDefinitionURL} from './web/definition-loader.js';
const here=dirname(fileURLToPath(import.meta.url));
export async function installManager(root){
 root=resolve(root);const manager=join(root,'manager');await mkdir(manager,{recursive:true});
 const registry=await loadDefinitionURL(new URL('./web/definitions/builtin.json',import.meta.url));
 const result=await build({entryPoints:[join(here,'library-manager/app.js')],write:false,bundle:true,platform:'browser',format:'iife',target:'chrome120',minify:true,plugins:[{name:'portable-definitions',setup(b){b.onLoad({filter:/[\\/]definition-runtime\.js$/},()=>({contents:'export const BUILTIN='+JSON.stringify(registry)+';export const formulaText=spec=>spec.inline??BUILTIN.sources[spec.file];',loader:'js'}));}}]});
 // HTML parsing normalizes CR/CRLF to LF before CSP checks inline content.
 // Hash that normalized text so Windows source checkouts and CRLF downloads work.
 const normalize=text=>text.replace(/\r\n?/g,'\n');
 const script=normalize(result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')),css=normalize(await readFile(join(here,'library-manager/style.css'),'utf8'));
 const digest=text=>createHash('sha256').update(text).digest('base64');
 const policy="default-src 'none'; script-src 'sha256-"+digest(script)+"'; style-src 'sha256-"+digest(css)+"'; img-src blob: data:; connect-src 'none'; base-uri 'none'; form-action 'none'";
 // Callback replacements keep literal dollar sequences in minified JS/CSS intact.
 let html=normalize(await readFile(join(here,'library-manager/index.html'),'utf8'));html=html.replace('<meta charset="utf-8">',()=>'<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+policy+'">').replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>').replace('<script type="module" src="app.js"></script>',()=>'<script>'+script+'</script>');
 await writeFile(join(manager,'index.html'),html);await writeFile(join(root,'library-manager.html'),html);
 // Retire only the known outputs of the superseded local-server distribution.
 for(const file of ['manager/server.mjs','manager/app.js','manager/style.css','启动管理器.bat','启动管理器.command','管理图库.html']){try{await unlink(join(root,file));}catch(e){if(e.code!=='ENOENT')throw e;}}
 await writeFile(join(manager,'README.md'),'# Momo 纯静态图库管理器\n\n使用新版桌面 Chrome 或 Edge 打开根目录“library-manager.html”，点击“选择本地图库目录”，选中下载或克隆的图库文件夹并授予读写权限。无需 Node.js、npm、服务或安装程序。也可通过 HTTPS 打开 manager/index.html，再选择本地目录；普通不安全 HTTP 和不支持文件夹写入的浏览器会显示明确说明。首次需选择目录并授权；以后记住上次目录，权限有效时自动恢复，需要授权时点击“继续使用”。“关闭图库”会忘记目录；清理浏览器数据或更换页面来源也需重新选择。\n\n只读写你选择的本地图库文件夹，不调用 Git、不上传 CDN、不保存远程凭据。页面即使放在线上，修改的也是访问者自己授权的本地文件，不是服务器资源。修改后请自行提交/推送或上传。\n\n支持正式单资源/合集 ZIP 导入预览、编辑目录名称/分类/标签/说明、批量移出目录、目录恢复。目录元信息不修改 ZIP、ID、版本或校验。移出目录保留旧 ZIP 和缩略图，兼容已有链接。“彻底删除”会移除所选目录条目并删除当前引用的 ZIP 和缩略图，共用文件保留；历史版本和此前移出目录的文件不自动清理。删除前需确认，旧项目下载可能受影响，目录快照/JSON 不能恢复已删除文件。先保存目录再清理文件；清理失败会列出未删除路径，需检查权限后手动清理。本地删除要自行发布后才影响远程，浏览器已有缓存不受本地删除直接影响。每次目录修改前在当前浏览器 IndexedDB 保存最多50份快照（按图库ID、页面来源区分），不会写进图库仓库；清理浏览器数据或换浏览器后无法恢复。重要备份请在“目录恢复”下载 JSON，并可从 JSON 恢复（要求图库身份和引用包校验通过）。\n\n不自动渲染缺失缩略图，也不编辑公式/图片内容。不要让其他程序同时修改目录；同来源窗口的写入通过浏览器锁串行，旧目录修订会被拒绝。单文件通过浏览器写入流提交，但不能保证整个文件夹或其他程序参与的原子事务。Chrome文件夹权限、安全上下文和文件系统限制由浏览器管理，请勿通过禁用安全保护来运行。\n\n管理器由 MomoTextureForge/build-library-manager.mjs 生成。开发者构建需要 Node 与开发依赖，最终使用者不需要。\n');
 return join(root,'library-manager.html');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--out')throw Error('用法：node build-library-manager.mjs --out 图库目录');console.log('已生成纯静态管理器：'+await installManager(resolve(args[1])));}
