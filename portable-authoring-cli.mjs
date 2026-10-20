import {readFile} from 'node:fs/promises';
import {parseAuthoring,AUTHORING_LIMIT} from './web/ai-authoring.js';
import {renderFile} from './authoring-render.mjs';
try{
 const [command,file,...args]=process.argv.slice(2);
 if(!file)throw Error('Usage: node scripts/texforge.mjs validate|render|check <file.graphic.json> [options]');
 if(command==='validate'){
  if(args.length)throw Error('validate does not accept options');
  const bytes=await readFile(file);if(bytes.length>AUTHORING_LIMIT)throw Error('创作文件超过2MB');
  const draft=parseAuthoring(bytes.toString('utf8'));console.log(JSON.stringify({ok:true,name:draft.name,gpu:'not-run',visual:'not-reviewed'},null,2));
 }else if(command==='render'||command==='check')await renderFile(command,file,args);
 else throw Error('Unknown command: '+command);
}catch(e){console.error(e.message);process.exitCode=1;}
