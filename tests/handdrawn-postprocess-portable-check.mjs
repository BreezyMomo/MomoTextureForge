import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {decodeZIP} from '../web/resource-zip.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {project,node} from '../web/tree-model.js';
const out=resolve('test-results/postprocess-portable');await mkdir(out,{recursive:true});const install=await mkdtemp(resolve(out,'skill-')),entries=await decodeZIP(await readFile('dist/texture-forge-ai-skill.zip'));
for(const [name,data]of entries){assert.doesNotMatch(name,/HanddrawnFillURP|MomoHanddrawnImporter|handdrawn-fill\.hlsl|\/shaders\/dynamic\//);const file=resolve(install,name);await mkdir(dirname(file),{recursive:true});await writeFile(file,data);}
const skill=resolve(install,'texture-forge-author'),cli=resolve(skill,'scripts/texforge.mjs');assert.match(await readFile(resolve(skill,'SKILL.md'),'utf8'),/references\/handdrawn-postprocess.md/);assert.match(await readFile(resolve(skill,'references/handdrawn-postprocess.md'),'utf8'),/inputAdapters/);
const p=project();p.root.children=[node('shape','TurbulentFlame')];Object.assign(p.root.children[0].postEffects.sketch,{enabled:true,hatchWidth:4.8});const flag=process.argv.indexOf('--input'),input=resolve(out,'source.zip');await writeFile(input,flag>=0?await readFile(process.argv[flag+1]):await encodeResourcePack(p));const before=await readFile(input),hash=createHash('sha256').update(before).digest('hex');
const run=async(...args)=>JSON.parse((await promisify(execFile)(process.execPath,[cli,'project',...args],{timeout:180000,maxBuffer:8*1024*1024,windowsHide:true})).stdout);
const supportFile=resolve(out,'support.json');await run('shader-support',input,'--output',supportFile);const support=JSON.parse(await readFile(supportFile,'utf8'));assert.equal(support.recommendedMode,'postprocess');assert.equal(support.modes.postprocess.supported,true);
const file=resolve(out,'handdrawn.zip'),report=await run('shader',input,'--shader-mode',support.recommendedMode,'--handdrawn-input','auto','--times','0,.75,1.5,2.25,3','--size','512','--output',file,'--timeout','180000');assert.equal(report.ok,true);const m=report.shaderManifest;assert.equal(m.schema,'momo.handdrawn-postprocess/v1');assert.equal(m.input.adapter,'generator');assert.equal(m.source.archiveSHA256,hash);assert.equal(m.parameters.native.hatchWidth,4.8);assert.equal(m.parameters.native.roughness,1.3);assert.deepEqual(await readFile(input),before);
for(const mode of ['handdrawn','dynamic-handdrawn']){let refused=false;try{await run('shader',input,'--shader-mode',mode,'--output',resolve(out,'retired.zip'));}catch(e){refused=true;assert.match(e.stderr??e.message,/retired.*postprocess/);}assert.equal(refused,true);}
await writeFile(resolve(out,'report.json'),JSON.stringify({pass:true,cli,packageId:m.packageId,inputStage:true,retiredModesRefused:true,legacyRendererNotDistributed:true,sourceSHA256:hash,sourceUnchanged:true,files:report.files},null,2));console.log('Unified postprocess portable Skill PASS: '+m.packageId);
