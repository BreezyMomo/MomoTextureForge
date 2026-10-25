import {readFile} from 'node:fs/promises';
import {AUTHORING_LIMIT} from './web/ai-authoring.js';
import {parseCreationAuthoring} from './web/creation-authoring.js';
import {renderFile} from './authoring-render.mjs';
import {runProjectTool} from './project-cli.mjs';
import {AUTHORING_ACTIONS,runAuthoringTool} from './project-authoring-cli.mjs';
try{
 const [command,file,...args]=process.argv.slice(2);
 if(command==='mcp')await (await import('./editor-mcp.mjs')).serveEditorMCP([file,...args].filter(v=>v!==undefined));
 else if(command==='modules'){if(!file||args[0]!=='--output'||!args[1]||args.length!==2)throw Error('Usage: texforge modules project.zip --output directory');console.log(JSON.stringify(await (await import('./engine-shader-cli.mjs')).extractEngineShaders(file,args[1]),null,2));}
 else if(!file)throw Error('Usage: node scripts/texforge.mjs mcp [options], validate|render|check <file.graphic.json>, or project <action> <project.zip> [options]');
 else if(command==='project'){
  if(AUTHORING_ACTIONS.includes(file))await runAuthoringTool(file,args);
  else{const [projectFile,...options]=args;if(!projectFile)throw Error('project requires an action and saved project ZIP');await runProjectTool(file,projectFile,options);}
 }else if(command==='validate'){
  if(args.length)throw Error('validate does not accept options');
  const bytes=await readFile(file);if(bytes.length>AUTHORING_LIMIT)throw Error('创作文件超过2MB');
  const draft=parseCreationAuthoring(bytes.toString('utf8'));console.log(JSON.stringify({ok:true,name:draft.name,gpu:'not-run',visual:'not-reviewed'},null,2));
 }else if(command==='render'||command==='check')await renderFile(command,file,args);
 else throw Error('Unknown command: '+command);
}catch(e){console.error(e.message);process.exitCode=1;}
