import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const pkg=JSON.parse(await readFile('node_modules/gifenc/package.json','utf8'));
const notice=`gifenc ${pkg.version}\nSource: https://github.com/mattdesl/gifenc\n\n${await readFile('node_modules/gifenc/LICENSE.md','utf8')}`;
await writeFile('web/vendor/GIF-LICENSE.txt',notice);
await build({stdin:{contents:"export {GIFEncoder,quantize,applyPalette} from 'gifenc';",resolveDir:process.cwd(),loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'inline',banner:{js:'/*!\n'+notice+'\n*/'},outfile:'web/vendor/gifenc.js'});
