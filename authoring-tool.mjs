import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseAuthoring,assetFromAuthoring,AUTHORING_GUIDE,AUTHORING_SKILL,AUTHORING_EXAMPLE,AUTHORING_LIMIT} from './web/ai-authoring.js';
import {bindFormulaParameters} from './web/formula-parameters.js';
const root=dirname(fileURLToPath(import.meta.url));
try{
 const [command,file,...args]=process.argv.slice(2);
 if((command==='render'||command==='check')&&file){await (await import('./authoring-render.mjs')).renderFile(command,file,args);}
 else
 if(command==='validate'&&file){const bytes=await readFile(file);if(bytes.length>AUTHORING_LIMIT)throw Error('创作文件超过2MB');const draft=parseAuthoring(bytes.toString('utf8')),asset=assetFromAuthoring(draft);const binding=bindFormulaParameters(draft.formula.source,asset.definition.parameters,draft.formula.kind);console.log(JSON.stringify({valid:true,name:draft.name,parameters:draft.parameters.length,unused:binding.unused,gpu:'not-run',visual:'not-run'},null,2));}
 else if(command==='build-kit'&&!file){await (await import('./build-authoring-kit.mjs')).buildAuthoringKit();console.log('Built portable Skill and dist/texture-forge-ai-skill.zip');}
 else throw Error('Usage: node authoring-tool.mjs validate <file.graphic.json> | render <file> [--time 0 --size 512 --output preview.png] | check <file> [--times 0,0.25,0.5,1,2 --output previews] | build-kit');
}catch(e){console.error(e.message);process.exitCode=1;}
