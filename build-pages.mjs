import {execFileSync} from 'node:child_process';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath,[join(root,'build-standalone.mjs')],{cwd:root,stdio:'inherit'});
const output=join(root,'site');
await mkdir(output,{recursive:true});
await copyFile(join(root,'dist','MomoTextureForge.html'),join(output,'index.html'));
await writeFile(join(output,'.nojekyll'),'');
console.log('GitHub Pages site: '+join(output,'index.html'));
