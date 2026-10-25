import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {decodeZIP,safePath} from './web/resource-zip.js';
import {graphicUnityModule,validateEngineShader} from './web/engine-shader-contract.js';
import {contentHash} from './web/resource-assets.js';

// Extract already supplied implementations, with no browser, compiler or AI translation.
export async function extractEngineShaders(input,output){
 const files=await decodeZIP(await readFile(input)),decoder=new TextDecoder('utf-8',{fatal:true});
 const read=name=>{safePath(name);if(!files.has(name))throw Error('Missing module dependency: '+name);return files.get(name);},json=name=>JSON.parse(decoder.decode(read(name))),manifest=json('manifest.json'),content=json(manifest.content),index=[];
 const root=resolve(output),unsupported=[];await mkdir(root,{recursive:true});
 const save=async(module,scope)=>{validateEngineShader(module);const folder=resolve(root,scope);if(!folder.startsWith(root+sep))throw Error('Invalid module path');const paths=[];for(const [name,text]of Object.entries(module.files)){safePath(name);const path=resolve(folder,name);if(!path.startsWith(folder+sep))throw Error('Invalid module path');await mkdir(dirname(path),{recursive:true});await writeFile(path,text);paths.push(path);}const {files:_,sourceSignature,...metadata}=module;const path=resolve(folder,'module.json');await writeFile(path,JSON.stringify({...metadata,files:paths},null,2)+'\n');index.push({...metadata,manifest:path,files:paths});};
 for(const record of manifest.assets??[]){const asset=json(record.file);if(!asset.engineShaders?.unity)continue;
  for(const [name,spec]of Object.entries(asset.libraries??{}))asset.libraries[name]=decoder.decode(read(spec.file));
  for(const spec of [asset.definition.outputs.scalar,asset.definition.seamless.source].filter(Boolean)){spec.inline=decoder.decode(read(spec.file));delete spec.file;}
  for(const [name,spec]of Object.entries(asset.engineShaders.unity.files))asset.engineShaders.unity.files[name]=decoder.decode(read(spec.file));
  if(await contentHash(asset)!==record.hash)throw Error('Resource integrity mismatch: '+record.id);
  const module=graphicUnityModule(asset);if(!module){unsupported.push({resourceId:record.id,reason:'Shader source binding is stale or verification failed; original sources remain in the resource ZIP for explicit adaptation.'});continue;}await save(module,'graphics/'+record.hash);
 }
 for(const [id,descriptor]of Object.entries(content.engineShaderModules??{})){const module=structuredClone(descriptor);for(const [name,spec]of Object.entries(module.files))module.files[name]=decoder.decode(read(spec.file));await save(module,'effects/'+id);}
 const handdrawn=[...files].filter(([name])=>name.startsWith('engine-shaders/effects/sketch/'));
 if(handdrawn.length){const paths=[];for(const [name,bytes]of handdrawn){safePath(name);const path=resolve(root,name);if(!path.startsWith(root+sep))throw Error('Invalid module path');await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);paths.push(path);}index.push({id:'handdrawn-postprocess',kind:'postprocess',effectId:'sketch',delivery:'shared-source-template',parameterDelivery:'Query project shader-support, then export with --shader-mode postprocess to bind actual parameters and check unsupported controls. These shared sources alone are not an importable prefab package.',files:paths});}
 await writeFile(resolve(root,'index.json'),JSON.stringify({schema:'momo.engine-modules-index/v1',modules:index,unsupported},null,2)+'\n');
 return {ok:true,modules:index.length,unsupported,index:resolve(root,'index.json'),engineVerification:'not-run'};
}
