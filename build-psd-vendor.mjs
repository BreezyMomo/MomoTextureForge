import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
// Checked-in browser encoder keeps the source server usable without npm or a CDN.
await mkdir('web/vendor',{recursive:true});
await build({stdin:{contents:"export {writePsdUint8Array} from 'ag-psd';",resolveDir:process.cwd(),loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'inline',outfile:'web/vendor/psd-writer.js'});
const licenses=await Promise.all(['ag-psd','base64-js','pako'].map(async name=>`\n## ${name}\n\n${await readFile(`node_modules/${name}/LICENSE`,'utf8')}`));
await writeFile('web/vendor/PSD-LICENSES.txt',`PSD browser encoder: ag-psd 31.0.3; generated with build-psd-vendor.mjs.\nSource: https://github.com/Agamnentzar/ag-psd\n${licenses.join('\n')}`);
