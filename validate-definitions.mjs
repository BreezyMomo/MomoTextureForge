import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadDefinitionURL} from './web/definition-loader.js';
const url=process.argv[2]?pathToFileURL(resolve(process.argv[2])):new URL('./web/definitions/builtin.json',import.meta.url);
try {
  const registry=await loadDefinitionURL(url);
  const count=kind=>registry.catalog.filter(p=>p.definition.seamless.kind===kind).length;
  console.log(JSON.stringify({result:'passed',patterns:registry.catalog.length,configurationFiles:registry.configFiles.length,parameters:registry.catalog.reduce((n,p)=>n+p.parameters.length,0),sourceFiles:Object.keys(registry.sources).length,vector:registry.catalog.filter(p=>p.vector).length,seamless:{periodic:count('periodic'),repeat:count('repeat'),blend:count('blend')}},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
