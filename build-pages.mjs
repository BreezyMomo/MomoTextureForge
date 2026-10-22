import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath,[join(root,'build-standalone.mjs')],{cwd:root,stdio:'inherit'});
const output=join(root,'site');
await mkdir(output,{recursive:true});
const analytics=await build({entryPoints:[join(root,'web/site-analytics.js')],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true});
const code=analytics.outputFiles[0].text;
if(/<\/script/i.test(code))throw Error('Unsafe analytics inline script terminator');
const html=(await readFile(join(root,'dist','MomoTextureForge.html'),'utf8'))
 .replace("script-src 'unsafe-inline'", "script-src 'unsafe-inline' https://hm.baidu.com")
 .replace('</head>',()=>`<script>${code}</script></head>`);
await writeFile(join(output,'index.html'),html);
await writeFile(join(output,'.nojekyll'),'');
console.log('GitHub Pages site: '+join(output,'index.html'));
