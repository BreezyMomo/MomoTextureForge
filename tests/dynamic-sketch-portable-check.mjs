import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {decodeZIP} from '../web/resource-zip.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {project,node} from '../web/tree-model.js';
const out=resolve('test-results/dynamic-portable');await mkdir(out,{recursive:true});const install=await mkdtemp(resolve(out,'skill-'));
for(const [name,bytes]of await decodeZIP(await readFile('dist/texture-forge-ai-skill.zip'))){const path=resolve(install,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);}
const cli=resolve(install,'texture-forge-author/scripts/texforge.mjs'),skill=resolve(install,'texture-forge-author'),entry=await readFile(resolve(skill,'SKILL.md'),'utf8');assert.match(entry,/references\/dynamic-handdrawn.md/);
assert.match(await readFile(resolve(skill,'references/dynamic-handdrawn.md'),'utf8'),/modes.dynamicHanddrawn/);assert.match(await readFile(resolve(skill,'references/shaders/dynamic/HatchBrush.compute'),'utf8'),/InterlockedMax/);
const p=project();p.root.children=[node('shape','TurbulentFlame')];p.root.children[0].postEffects.sketch.enabled=true;p.root.children[0].postEffects.sketch.hatchWidth=4.8;const inputFlag=process.argv.indexOf('--input'),input=resolve(out,'source-project.zip');await writeFile(input,inputFlag>=0?await readFile(process.argv[inputFlag+1]):await encodeResourcePack(p));const original=await readFile(input),sha=createHash('sha256').update(original).digest('hex');
const run=async(...args)=>JSON.parse((await promisify(execFile)(process.execPath,[cli,'project',...args],{timeout:180000,maxBuffer:8*1024*1024,windowsHide:true})).stdout);
const supportFile=resolve(out,'support.json');await run('shader-support',input,'--output',supportFile);const support=JSON.parse(await readFile(supportFile,'utf8'));assert.equal(support.recommendedMode,'dynamic-handdrawn');assert.equal(support.modes.dynamicHanddrawn.supported,true);
const file=resolve(out,'live-handdrawn.zip'),report=await run('shader',input,'--shader-mode',support.recommendedMode,'--times','0,.75,1.5,2.25,3','--size','512','--output',file,'--timeout','180000');assert.equal(report.ok,true);const m=report.shaderManifest;assert.equal(m.schema,'momo.dynamic-handdrawn/v1');assert.equal(m.source.archiveSHA256,sha);assert.equal(m.displayMaterialProperties.find(p=>p.name==='_Width').floatValue,4.8);assert.equal(m.displayMaterialProperties.find(p=>p.name==='_FillRoughness').floatValue,1.3);assert.deepEqual(await readFile(input),original);
await writeFile(resolve(out,'report.json'),JSON.stringify({pass:true,cli,packageId:m.packageId,sourceSHA256:sha,noSourceCheckoutDependency:true,files:report.files},null,2));console.log('Portable Skill live handdrawn export PASS: '+m.packageId);
