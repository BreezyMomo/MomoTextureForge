import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
// A checked-in ESM bundle keeps the source server and offline builds independent of a CDN.
const names=['roughjs','hachure-fill','path-data-parser','points-on-curve','points-on-path'];
const licenses=await Promise.all(names.map(async name=>{const pkg=JSON.parse(await readFile(`node_modules/${name}/package.json`,'utf8'));return `## ${name} ${pkg.version}\n\n${await readFile(`node_modules/${name}/LICENSE`,'utf8')}`;}));
const notice='Rough.js and bundled dependencies\nSource: https://github.com/rough-stuff/rough\n\n'+licenses.join('\n\n');
await writeFile('web/vendor/ROUGH-LICENSES.txt',notice);
await build({stdin:{contents:"export {default} from 'roughjs/bundled/rough.esm.js';",resolveDir:process.cwd(),loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'inline',banner:{js:'/*!\n'+notice.replaceAll('*/','* /')+'\n*/'},outfile:'web/vendor/rough.js'});
