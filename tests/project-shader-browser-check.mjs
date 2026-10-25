import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {runProjectBrowser} from '../project-cli.mjs';
import {project,node} from '../web/tree-model.js';
import {decodeZIP} from '../web/resource-zip.js';
import {SHADER_GRAPHICS} from '../web/project-shader-compiler.js';
const out=resolve('test-results/project-shader');await mkdir(out,{recursive:true});const reports=[];
for(const type of SHADER_GRAPHICS){
 const p=project();p.root.children=[node('shape',type)];p.root.children[0].id='graphic-'+type;
 const r=await runProjectBrowser('runProjectTool',{action:'shader',input:{project:p},options:{times:[0,.75],size:['LedBar','FlowingWater'].includes(type)?512:128,node:null,shaderMode:'realtime'}},120000);assert.equal(r.ok,true,r.error);
 assert.equal(r.manifest.verification.browserCompilation,'passed');assert.equal(r.manifest.verification.engineCompilation,'not-run');assert.equal(r.manifest.verification.frames.length,2);
 assert.ok(r.manifest.verification.frames.every(f=>Number.isFinite(f.blackRGBMAE255)&&f.blackRGBMAE255<6),JSON.stringify(r.manifest.verification));
 const entries=await decodeZIP(Buffer.from(r.zip,'base64')),directory=resolve(out,type);for(const [name,bytes]of entries){const path=resolve(directory,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);}
 const compiler=process.argv.indexOf('--fxc'),fxc=compiler>=0?process.argv[compiler+1]:null;
 if(fxc){
  const name=r.manifest.packageId,hlsl=new TextDecoder().decode(entries.get('Unity/'+name+'.hlsl')),shader=new TextDecoder().decode(entries.get('Unity/'+name+'.shader'));
  const program=shader.split('HLSLPROGRAM')[1].split('ENDHLSL')[0].replace(/^\s*#pragma[^\n]*$/gm,'').replace(/#include "Packages[^\n]+/, 'float4 TransformObjectToHClip(float3 p){return float4(p,1.);}\n#define CBUFFER_START(x) cbuffer x {\n#define CBUFFER_END }\nfloat4 _Time;').replace('#include "'+name+'.hlsl"',()=>hlsl);
  for(const gamma of [false,true]){const file=resolve(directory,'wrapper-'+(gamma?'gamma':'linear')+'.hlsl');await writeFile(file,(gamma?'#define UNITY_COLORSPACE_GAMMA\n':'')+program);execFileSync(fxc,['/nologo','/Ges','/T','ps_5_0','/E','MF_Frag','/O3','/Fo',file+'.cso',file],{encoding:'utf8'});}
 }
 reports.push({graphic:type,browser:true,wrapperHLSL:fxc?'compiled-linear-and-gamma':'not-run',unity:'not-run',frames:r.manifest.verification.frames});
}
for(const feature of ['blur','track']){
 const p=project(),n=p.root.children[0];n.id='blocked-node';if(feature==='blur'){n.postEffects.blur.enabled=true;n.postFx[0]=4;}else n.tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,.2],[1,.8]]};
 const r=await runProjectBrowser('runProjectTool',{action:'shader',input:{project:p},options:{times:[0],size:64,shaderMode:'realtime'}},120000);assert.equal(r.ok,false);assert.equal(r.zip,undefined);assert.ok(r.support.issues.some(i=>i.nodeId==='blocked-node'&&i.capability===(feature==='blur'?'effect:blur':'keyframes')));
}
await writeFile(resolve(out,'report.json'),JSON.stringify({reports,unsupported:['blur','track']},null,2));console.log(JSON.stringify({pass:true,graphics:reports.length,wrapperCompilation:reports.map(r=>r.wrapperHLSL),unsupported:['blur','track']}));
