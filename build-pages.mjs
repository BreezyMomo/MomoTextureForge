import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

import {loadDefinitionURL} from './web/definition-loader.js';
import thumbnails from './web/builtin-thumbnails.js';

const root=dirname(fileURLToPath(import.meta.url)),web=join(root,'web'),output=join(root,'site'),assets=join(output,'assets');
// Preserve the complete file:// distribution separately from the hosted build.
execFileSync(process.execPath,[join(root,'build-standalone.mjs')],{cwd:root,stdio:'inherit'});
await mkdir(assets,{recursive:true});
const files=new Map(),hash=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,16);
const add=(name,bytes)=>{files.set(name,bytes);return name;};
const named=(name,extension,bytes)=>add(`assets/${name}-${hash(bytes)}.${extension}`,bytes);
const common={absWorkingDir:root,bundle:true,write:false,platform:'browser',target:'es2022',minify:true,charset:'utf8',legalComments:'inline'};
const registry=await loadDefinitionURL(new URL('./web/definitions/builtin.json',import.meta.url));
const runtime=`export const BUILTIN=${JSON.stringify(registry).replaceAll('<','\\u003c')};export const formulaText=spec=>spec.inline??BUILTIN.sources[spec.file];`;
const definitions={name:'pages-definitions',setup(b){b.onLoad({filter:/[\\/]definition-runtime\.js$/},()=>({contents:runtime,loader:'js',resolveDir:web}));}};
// Resources need synchronous Shader signatures; cache implementations independently of UI updates.
const shaders=await build({...common,entryPoints:['web/engine-shader-runtime.js'],format:'esm'});
const shaderFile=named('engine-shaders','js',shaders.outputFiles[0].contents);
const worker=await build({...common,entryPoints:['web/export-worker.js'],format:'esm',plugins:[definitions]});
const workerFile=named('export-worker','js',worker.outputFiles[0].contents);
const thumbnailURLs={};
for(const [id,data] of Object.entries(thumbnails)){
 const match=/^data:image\/(png|jpeg|webp);base64,([\s\S]+)$/.exec(data);if(!match)throw Error('Invalid built-in thumbnail: '+id);
 const bytes=Buffer.from(match[2],'base64'),file=named('thumbnail-'+id,match[1]==='jpeg'?'jpg':match[1],bytes);
 thumbnailURLs[id]='./'+file.slice('assets/'.length);
}
const result=await build({...common,entryPoints:{pages:'web/pages.js'},outdir:assets,entryNames:'[name]-[hash]',chunkNames:'chunk-[hash]',format:'esm',splitting:true,metafile:true,loader:{'.html':'text'},plugins:[definitions,{name:'pages-assets',setup(b){
 b.onResolve({filter:/[\\/]engine-shader-runtime\.js$/},()=>({path:'./'+shaderFile.slice('assets/'.length),external:true}));
 b.onLoad({filter:/[\\/]builtin-thumbnails\.js$/},()=>({contents:'export default Object.fromEntries(Object.entries('+JSON.stringify(thumbnailURLs)+').map(([id,path])=>[id,new URL(path,import.meta.url).href]));',loader:'js'}));
 b.onLoad({filter:/[\\/]export-worker-source\.js$/},()=>({contents:'export default null;export const workerURL=new URL('+JSON.stringify('./'+workerFile.slice('assets/'.length))+',import.meta.url);',loader:'js'}));
}}]});
for(const file of result.outputFiles)add(relative(output,file.path).replaceAll('\\','/'),file.contents);
const entry=Object.entries(result.metafile.outputs).find(([,value])=>value.entryPoint==='web/pages.js')?.[0];if(!entry)throw Error('Pages entry missing');
const entryFile=relative(output,join(root,entry)).replaceAll('\\','/');
const styles=['theme-tokens','style','tree','graphics-workspace','dock-workspace','inspector-color','editor-surfaces','creative-skins','tab-styles','palette-roles','workspace-workflow'];
const css=await build({...common,stdin:{contents:(await Promise.all(styles.map(name=>readFile(join(web,name+'.css'),'utf8')))).join('\n'),loader:'css',resolveDir:web}});
const cssFile=named('editor','css',css.outputFiles[0].contents);
const policy="default-src 'none'; script-src 'self' 'unsafe-inline' https://hm.baidu.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; connect-src https: http:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'";
let html=(await readFile(join(web,'index.html'),'utf8'))
 .replace('<html lang="zh-CN">','<html lang="zh-CN" data-distribution="pages">')
 .replace('<link rel="stylesheet" href="theme-tokens.css" />',()=>`<meta http-equiv="Content-Security-Policy" content="${policy}"><link rel="stylesheet" href="./${cssFile}" data-tree-style>`)
 .replace('<link rel="stylesheet" href="style.css" />','')
 .replace('<script type="module" src="bootstrap.js"></script>',()=>`<script type="module" src="./${entryFile}"></script>`);
if(html.includes('src="bootstrap.js"'))throw Error('Pages bootstrap replacement failed');
const psdLicenses=await readFile(join(web,'vendor/PSD-LICENSES.txt'),'utf8');
html='<!--\n'+psdLicenses.replaceAll('--','—')+'\n-->\n'+html;
for(const [name,bytes] of files){await mkdir(dirname(join(output,name)),{recursive:true});await writeFile(join(output,name),bytes);}
const temporary=join(output,`.index-${process.pid}.html`);await writeFile(temporary,html);await rename(temporary,join(output,'index.html'));
await writeFile(join(output,'.nojekyll'),'');
// Clean only obsolete files in the generated asset directory, never user/source folders.
for(const item of await readdir(assets,{withFileTypes:true}))if(item.isFile()&&!files.has('assets/'+item.name))await unlink(join(assets,item.name));
const staticFiles=Object.fromEntries(Object.entries(result.metafile.outputs).map(([name,value])=>[relative(output,join(root,name)).replaceAll('\\','/'),value]));
const initial=new Set();function visit(name){if(initial.has(name))return;const file=staticFiles[name];if(!file){if(files.has(name)){initial.add(name);return;}throw Error('Unknown Pages dependency: '+name);}initial.add(name);for(const spec of file.imports)if(spec.kind!=='dynamic-import')visit(spec.external?'assets/'+spec.path.replace(/^\.\//,''):relative(output,join(root,spec.path)).replaceAll('\\','/'));}visit(entryFile);
const report={schema:'momo-texture-pages-build/v1',htmlBytes:Buffer.byteLength(html),bootstrapBytes:Buffer.byteLength(html)+files.get(cssFile).length+[...initial].reduce((sum,name)=>sum+files.get(name).length,0),totalBytes:Buffer.byteLength(html)+[...files.values()].reduce((sum,bytes)=>sum+bytes.length,0),assetFiles:files.size,entry:entryFile,css:cssFile,shaders:shaderFile,worker:workerFile,initial:[...initial],chunks:staticFiles};
await mkdir(join(root,'test-results'),{recursive:true});await writeFile(join(root,'test-results/pages-build.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,chunks:undefined,initial:undefined},null,2));
console.log('GitHub Pages site: '+join(output,'index.html'));
