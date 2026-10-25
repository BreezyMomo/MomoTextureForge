import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {runProjectBrowser} from '../project-cli.mjs';
import {project,node} from '../web/tree-model.js';
import {decodeZIP} from '../web/resource-zip.js';
import {createHash} from 'node:crypto';
const p=project();p.root.children=[node('shape','TurbulentFlame')];const n=p.root.children[0];n.id='live-fire';n.params[0]=7872;Object.assign(n.postEffects.sketch,{enabled:true,hatchWidth:4.8,roughness:1.3,bowing:1,maxRandomnessOffset:2});
const inputFlag=process.argv.indexOf('--input'),input=inputFlag>=0?{zip:(await readFile(process.argv[inputFlag+1])).toString('base64')}:{project:p};
const out=resolve('test-results/dynamic-sketch');await mkdir(out,{recursive:true});
const run=(action,options)=>runProjectBrowser('runProjectTool',{action,input,options:{times:[0,.75,1.5],size:512,node:null,shaderMode:'dynamic-handdrawn',...options}},180000);
const support=await run('shader-support');assert.equal(support.ok,true,support.error);assert.equal(support.support.supported,true,JSON.stringify(support));
const r=await run('shader');assert.equal(r.ok,true,r.error);const m=r.manifest,files=await decodeZIP(Buffer.from(r.zip,'base64')),text=name=>new TextDecoder().decode(files.get(name));
assert.equal(m.schema,'momo.dynamic-handdrawn/v1');assert.deepEqual(m.inputTextures,[]);assert.equal(m.verification.engineCompilation,'not-run');assert.equal(m.verification.browserNativeReferences,'passed');assert.equal(files.has('mask.png'),false);assert.equal(files.has('stroke-mask.png'),false);assert.equal(files.has('source-project.zip'),true);
for(const [name,value]of [['_Width',4.8],['_FillRoughness',1.3],['_FillBowing',1],['_FillMaxOffset',2],['_Roughness',.13],['_DoubleFill',1]])assert.equal(m.displayMaterialProperties.find(p=>p.name===name).floatValue,value,name);
const ink=m.displayMaterialProperties.find(p=>p.name==='_InkColor'),stroke=m.displayMaterialProperties.find(p=>p.name==='_StrokeColor');assert.equal(ink.vectorValue.x,233/255);assert.equal(stroke.vectorValue.x,32/255);assert.ok(ink.linearValue[0]<ink.vectorValue.x);assert.match(m.color.materialInput,/sRGB/);
assert.equal(m.parameters.graphic.filter(p=>p.variable).length,20);assert.match(text(m.runtime.file),new RegExp('namespace '+m.runtime.type.split('.').slice(0,-1).join('\\.')));
for(const record of m.integrity)assert.equal(createHash('sha256').update(files.get(record.file)).digest('hex'),record.sha256);
for(const [name,data]of files){const path=resolve(out,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,data);}await writeFile(resolve(out,'shader-reference.zip'),Buffer.from(r.zip,'base64'));
const fxcFlag=process.argv.indexOf('--fxc');if(fxcFlag>=0){
 const fxc=process.argv[fxcFlag+1];
 const compile=async(name,source,entry,profile)=>{const path=resolve(out,name+'.hlsl');await writeFile(path,source);execFileSync(fxc,['/nologo','/Ges','/T',profile,'/E',entry,'/O3','/Fo',path+'.cso',path],{encoding:'utf8'});};
 for(const entry of ['BuildHatch','ClearDiagnostics'])await compile(entry,text('Unity/HatchBrush.compute'),entry,'cs_5_0');
 const sourceShader=text('Unity/'+m.files.sourceShader).split('HLSLPROGRAM')[1].split('ENDHLSL')[0].replace(/^\s*#pragma[^\n]*$/gm,'').replace('#include "UnityCG.cginc"','struct v2f_img{float4 pos:SV_POSITION;float2 uv:TEXCOORD0;};').replace('#include "'+m.files.sourceHLSL+'"',()=>text('Unity/'+m.files.sourceHLSL));await compile('coverage',sourceShader,'Frag','ps_5_0');
 const stub='float4 TransformObjectToHClip(float3 p){return float4(p,1.);}\n#define CBUFFER_START(x) cbuffer x {\n#define CBUFFER_END }\n#define TEXTURE2D(n) Texture2D<float4> n\n#define SAMPLER(n) SamplerState n\n#define SAMPLE_TEXTURE2D_LOD(t,s,u,l) t.SampleLevel(s,u,l)\n';
 const display=text('Unity/'+m.files.displayShader).split('HLSLPROGRAM')[1].split('ENDHLSL')[0].replace(/^\s*#pragma[^\n]*$/gm,'').replace(/#include "Packages[^\n]+/,()=>stub).replace('#include "handdrawn-fill.hlsl"',()=>text('Unity/handdrawn-fill.hlsl')).replace('#include "hatch-brush.hlsl"',()=>text('Unity/hatch-brush.hlsl'));await compile('display',display,'Frag','ps_5_0');
}
// No implicit dynamic upgrade: explicit legacy handdrawn still delivers v2.
const legacy=await runProjectBrowser('runProjectTool',{action:'shader',input:{project:p},options:{node:n.id,shaderMode:'handdrawn',times:[0],size:128}},120000);assert.equal(legacy.ok,true,legacy.error);assert.equal(legacy.manifest.referenceVersion,2);
n.postEffects.sketch.source=1;const rejected=await runProjectBrowser('runProjectTool',{action:'shader',input:{project:p},options:{node:n.id,shaderMode:'dynamic-handdrawn',times:[0],size:128}},120000);assert.equal(rejected.ok,false);assert.equal(rejected.zip,undefined);assert.ok(rejected.support.issues.some(i=>i.capability==='contour-source'));
await writeFile(resolve(out,'report.json'),JSON.stringify({pass:true,package:m.packageId,nativeReferences:3,parameters:true,integrity:true,noInputTextures:true,legacyV2:true,rejection:true,hlsl:fxcFlag>=0?'compiled':'not-run',unity:'not-run'},null,2));console.log('Dynamic handdrawn browser/packaging PASS: '+m.packageId);
