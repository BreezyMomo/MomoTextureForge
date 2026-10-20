// Repackage an exported, extracted resource directory after editing its formulas.
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {encodeResourcePack,PACK_SCHEMA,ENGINE_ABI} from './web/resource-pack.js';
import {safePath} from './web/resource-zip.js';
const [folder,output]=process.argv.slice(2);if(!folder||!output)throw Error('Usage: node pack-resource-folder.mjs <folder> <output.zip>');
const root=await realpath(folder);
const read=async name=>{safePath(name);const path=await realpath(resolve(root,name));if(!path.startsWith(root+sep))throw Error('Resource escapes package directory');return readFile(path);};
const json=async name=>JSON.parse((await read(name)).toString('utf8'));
const manifest=await json('manifest.json');if(manifest.schema!==PACK_SCHEMA||manifest.abi!==ENGINE_ABI)throw Error('Unsupported manifest');
const assets=[];for(const entry of manifest.assets){const asset=await json(entry.file);
 for(const [name,spec]of Object.entries(asset.libraries))asset.libraries[name]=(await read(spec.file)).toString('utf8');
 for(const spec of [asset.definition.outputs.scalar,asset.definition.seamless.source].filter(Boolean)){spec.inline=(await read(spec.file)).toString('utf8');delete spec.file;}
 if(asset.kind==='image'){asset.data=(await read(asset.file)).toString('base64');delete asset.file;}
 assets.push([entry.id,asset]);
}
await writeFile(output,await encodeResourcePack(await json(manifest.content),{assets}));
console.log('Resource pack written: '+output);
