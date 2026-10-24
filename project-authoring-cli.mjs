import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,dirname,extname,basename} from 'node:path';
import {runProjectBrowser} from './project-cli.mjs';
import {PACK_LIMIT} from './web/resource-zip.js';
import {DOCUMENT_SCHEMA,RECIPE_SCHEMA,safeData} from './web/project-authoring-contract.js';

export const AUTHORING_ACTIONS=['catalog','schema','create','edit','pack','unpack'];
export function authoringOptions(action,args){
 if(!AUTHORING_ACTIONS.includes(action))throw Error('Unknown offline editor action: '+action);
 const options={timeout:120000,output:{catalog:'catalog.json',schema:'project-schema.json',create:'project.zip',edit:'edited-project.zip',pack:'project.zip',unpack:'project.document.json'}[action]};
 const rest=[...args];if(!['catalog','schema'].includes(action)){if(!rest[0]||rest[0].startsWith('--'))throw Error(action+' requires an input file');options.file=rest.shift();}
 const allowed=new Set(['--output','--timeout',...(action==='edit'?['--operations']:[]),...(action==='catalog'?['--query','--id','--from']:[])]),seen=new Set();
 for(let i=0;i<rest.length;i+=2){const key=rest[i],value=rest[i+1];if(!allowed.has(key)||seen.has(key)||!value||value.startsWith('--'))throw Error('Invalid '+action+' option: '+key);seen.add(key);options[key.slice(2)]=key==='--timeout'?Number(value):value;}
 if(!Number.isInteger(options.timeout)||options.timeout<1000||options.timeout>300000)throw Error('timeout must be 1000 to 300000 ms');
 if(action==='edit'&&!options.operations)throw Error('edit requires --operations <recipe.json>');
 const ext=['create','edit','pack'].includes(action)?'.zip':'.json';if(!options.output.toLowerCase().endsWith(ext))throw Error(action+' output must end with '+ext);
 // A failed edit/pack must never overwrite the only copy of a user's input.
 for(const source of [options.file,options.operations,options.from].filter(Boolean))if(resolve(source)===resolve(options.output))throw Error('Choose an output file different from the input');
 return options;
}
async function boundedRead(file,limit=PACK_LIMIT){if((await stat(file)).size>limit)throw Error('Input exceeds '+limit+' bytes: '+file);return readFile(file);}
async function jsonFile(file){const text=(await boundedRead(file)).toString('utf8').replace(/^\uFEFF/,'');const value=JSON.parse(text);safeData(value);return value;}
async function projectInput(file){const bytes=await boundedRead(file);if(bytes[0]===80&&bytes[1]===75)return {zip:bytes.toString('base64')};const data=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));safeData(data);return data.schema===DOCUMENT_SCHEMA?{document:data}:{project:data};}
export async function runAuthoringTool(action,args){
 const options=authoringOptions(action,args),output=resolve(options.output),reportPath=output.replace(/\.[^.]+$/,'.report.json');await mkdir(dirname(output),{recursive:true});
 const report={schema:'momo.project-authoring-report/v1',ok:false,action,output,files:[],engineCompilation:'not-run',visualReview:'not-reviewed'};
 try{
  const recipeFile=action==='create'?options.file:options.operations,recipe=recipeFile?await jsonFile(recipeFile):undefined;
  if(recipe&&recipe.schema!==RECIPE_SCHEMA)throw Error('Expected '+RECIPE_SCHEMA);
  const resources=[];let size=0;
  for(const spec of recipe?.resources??[]){
   if(!spec||typeof spec.id!=='string'||!spec.id||spec.id.length>128||typeof spec.file!=='string'||spec.select!==undefined&&typeof spec.select!=='string'||Object.keys(spec).some(k=>!['id','file','select'].includes(k)))throw Error('Resource requires id, file and optional select');
   const file=resolve(dirname(resolve(recipeFile)),spec.file),data=await boundedRead(file);size+=data.length;if(size>PACK_LIMIT)throw Error('Combined resource inputs exceed 64 MiB');
   const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'}[extname(file).toLowerCase()];resources.push({id:spec.id,select:spec.select,name:basename(file),mime,data:data.toString('base64')});
  }
  const inputFile=action==='catalog'?options.from:action==='create'||action==='schema'?null:options.file;
  const result=await runProjectBrowser('runProjectAuthoring',{action,input:inputFile?await projectInput(inputFile):null,recipe,resources,options},options.timeout);
  if(!result.ok)throw Error(result.error);
  await writeFile(output,result.zip?Buffer.from(result.zip,'base64'):JSON.stringify(result.json,null,2)+'\n');report.files.push(output);
  for(const key of ['normalizations','created','imported','nodes','validation'])if(result[key]!==undefined)report[key]=result[key];
  report.ok=true;
 }catch(error){report.error=error.message;}
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,reportPath},null,2));if(!report.ok)process.exitCode=1;return report;
}
