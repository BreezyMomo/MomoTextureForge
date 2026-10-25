import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {decodeZIP} from '../web/resource-zip.js';
import {buildEngineShaderRuntime} from '../build-engine-shader-runtime.mjs';
const input=process.argv[2];if(!input||process.argv.length!==3)throw Error('Usage: node tools/approve-engine-shader-batch.mjs batch.json');
const batch=JSON.parse(await readFile(input,'utf8')),root=resolve('web/shaders/graphics');
if(batch.schema!=='momo.engine-shader-batch/v1'||!Array.isArray(batch.graphics)||!Array.isArray(batch.failures))throw Error('Invalid batch report');
for(const row of [...batch.graphics,...batch.failures]){
 const folder=resolve(root,row.id);if(dirname(folder)!==root)throw Error('Invalid graphic path');const file=resolve(folder,'module.json');let module;try{module=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')continue;throw error;}
 if(row.supported){const bytes=await readFile(row.path);if(createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Frozen package changed: '+row.id);const files=await decodeZIP(bytes);for(const name of [module.hlslFile,module.shaderFile])if(new TextDecoder().decode(files.get(name))!==await readFile(resolve(folder,name),'utf8'))throw Error('Implementation changed since validation: '+row.id);}
 Object.assign(module.verification,{browserParity:row.supported?'passed':'failed',referenceCases:row.cases?.length??0,worstBackgroundMAE255:row.worst??null,referenceResolution:row.cases?.[0]?.width??null,maeThreshold255:10});
 await writeFile(file,JSON.stringify(module,null,2)+'\n');
}
const runtime=await buildEngineShaderRuntime();console.log(JSON.stringify({graphics:Object.keys(runtime.graphics).length,effects:Object.keys(runtime.effects).length,engineVerification:'not changed by browser approval'}));
