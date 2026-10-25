import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeEngineShaderRuntime} from './write-engine-shader-runtime.mjs';
import {validateEngineShader} from './web/engine-shader-contract.js';
export async function buildEngineShaderRuntime(){
 const runtime={graphics:{},effects:{}};
 for(const [kind,folder]of [['graphics','web/shaders/graphics'],['effects','web/shaders/postprocess/modules']]){
  for(const entry of await readdir(folder,{withFileTypes:true})){if(!entry.isDirectory())continue;const root=resolve(folder,entry.name),module=JSON.parse(await readFile(resolve(root,'module.json'),'utf8'));if(kind==='graphics'&&module.verification.browserParity!=='passed'||module.verification.engineCompilation==='failed'||module.verification.engineVisualReview==='failed')continue;
   const files={};for(const name of module.files)files[name]=await readFile(resolve(root,name),'utf8');module.files=files;validateEngineShader(module);runtime[kind][entry.name]=module;
  }
 }
 await writeEngineShaderRuntime(runtime);return runtime;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildEngineShaderRuntime();
