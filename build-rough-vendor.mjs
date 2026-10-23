import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
// A checked-in ESM bundle keeps the source server and offline builds independent of a CDN.
const names=['roughjs','hachure-fill','path-data-parser','points-on-curve','points-on-path'];
const licenses=await Promise.all(names.map(async name=>{const pkg=JSON.parse(await readFile(`node_modules/${name}/package.json`,'utf8'));return `## ${name} ${pkg.version}\n\n${await readFile(`node_modules/${name}/LICENSE`,'utf8')}`;}));
const notice='Rough.js and bundled dependencies\nSource: https://github.com/rough-stuff/rough\nLocal adaptation: dot centers use seeded randomness for deterministic project and export rendering.\n\n'+licenses.join('\n\n');
await writeFile('web/vendor/ROUGH-LICENSES.txt',notice);
await build({stdin:{contents:"export {default} from 'roughjs/bin/rough.js';",resolveDir:process.cwd(),loader:'js'},plugins:[{
 name:'seeded-dot-layout',setup(builder){builder.onLoad({filter:/roughjs[\\/]bin[\\/]fillers[\\/]dot-filler\.js$/},async({path})=>{
  // Upstream 4.6.6 uses Math.random for dot centers even when a seed is supplied.
  // Keep the same distribution, but use an independent seeded stream for layout.
  const source=await readFile(path,'utf8');
  if((source.match(/Math\.random\(\)/g)??[]).length!==2)throw Error('Review upstream dot filler before updating the deterministic patch');
  return {contents:"import {Random} from '../math.js';\n"+source.replace('const ops = [];','const ops = []; const layoutRandom = new Random(o.seed || 1);').replaceAll('Math.random()','layoutRandom.next()'),loader:'js'};
 });}
}],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'inline',banner:{js:'/*!\n'+notice.replaceAll('*/','* /')+'\n*/'},outfile:'web/vendor/rough.js'});
