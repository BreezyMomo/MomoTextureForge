import test from 'node:test';
import assert from 'node:assert/strict';
import {builtinAsset,registerAsset,unregisterAsset} from '../web/resource-assets.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {encodeZIP} from '../web/encoders.js';
import {decodeZIP} from '../web/resource-zip.js';
import {project,node,sanitizeTree} from '../web/tree-model.js';
import {graphicUnityModule,graphicShaderSignature} from '../web/engine-shader-contract.js';
import {exportGraphicShader} from '../web/graphic-shader.js';
import {hasGraphicShader,compileProjectShader} from '../web/project-shader-compiler.js';
import {assetFromAuthoring,authoringFromEditor,scalarHelpers,parseAuthoring,AUTHORING_SCHEMA} from '../web/ai-authoring.js';
import {extractEngineShaders} from '../engine-shader-cli.mjs';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {exportPostEffectShader} from '../web/post-effect-shader.js';
import {validatePortablePack} from '../library-manager/validate-pack.mjs';
import {LiveProjectService} from '../editor-mcp.mjs';
import {createHash} from 'node:crypto';

test('native resource packs carry readable Shader files and preserve them through import and sharing',async()=>{
 const p=project();p.root.children=[node('shape','Ring')];p.graphicResource={kind:'composition'};const before=JSON.stringify(p),asset=builtinAsset('Ring'),module=graphicUnityModule(asset);
 const bytes=await encodeResourcePack(p),files=await decodeZIP(bytes),manifest=JSON.parse(new TextDecoder().decode(files.get('manifest.json'))),descriptor=JSON.parse(new TextDecoder().decode(files.get(manifest.assets.find(a=>a.id==='Ring').file)));
 assert.equal(JSON.stringify(p),before);assert.ok([...files.keys()].some(name=>name.endsWith('.shader')));
 const entry=descriptor.engineShaders.unity.files[module.hlslFile].file;assert.equal(new TextDecoder().decode(files.get(entry)),module.files[module.hlslFile]);
 await validatePortablePack(bytes);const pack=await readResourcePack(bytes);try{assert.equal(pack.mapping.get('Ring'),'Ring');const second=await encodeResourcePack(pack.payload);assert.deepEqual(await decodeZIP(second),files);}finally{pack.rollback();}
 const corrupt=new Map(files);corrupt.set(entry,new TextEncoder().encode('corrupted Shader'));await assert.rejects(readResourcePack(encodeZIP([...corrupt].map(([name,data])=>({name,data})))),/校验/);
});

test('download preserves the formal implementation and maps current values without retranslating it',async()=>{
 const asset=builtinAsset('Ring'),module=graphicUnityModule(asset),params=[...asset.definition.defaults];params[0]=.62;params[1]=.025;
 const result=await exportGraphicShader({type:'Ring',params}),files=await decodeZIP(result.bytes),manifest=JSON.parse(new TextDecoder().decode(files.get('Unity/parameters.json')));
 assert.equal(new TextDecoder().decode(files.get(module.hlslFile)),module.files[module.hlslFile]);
 assert.ok(files.has('Unity/Shared/Runtime/MomoGraphicRenderer.cs'));assert.ok(files.has('Unity/Shared/GraphicResolve.shader'));assert.ok(files.has('Unity/Shared/NumericSRGBDisplay.shader'));
 for(const parameter of module.parameters)assert.equal(manifest.materialProperties.find(p=>p.name===parameter.property).floatValue,params[parameter.slot]);
 module.files[module.hlslFile]='edited local module';assert.notEqual(graphicUnityModule(builtinAsset('Ring')).files[module.hlslFile],module.files[module.hlslFile],'editing one resource cannot mutate the builtin implementation');
});

test('a module cannot advertise complete parameters when two controls share one property or engine verification failed',()=>{
 const asset=builtinAsset('Ring'),module=graphicUnityModule(asset),property=module.parameters[1].property;module.parameters[1].property=module.parameters[0].property;assert.equal(graphicUnityModule(asset),null);module.parameters[1].property=property;module.verification.engineVisualReview='failed';assert.equal(graphicUnityModule(asset),null);
});

test('analytic composition reuses maintained HLSL and remaps properties for each instance',async()=>{
 const asset=builtinAsset('TurbulentFlame'),module=graphicUnityModule(asset),original=module.files[module.hlslFile];
 module.files[module.hlslFile]=original.replace(/(MF_graphic1_hash21\([^)]*\)\s*\{)/,'$1/* maintained-port-proof */');
 registerAsset('maintained-water',asset);
 try{const p=project();p.root.children=[node('shape','maintained-water'),node('shape','maintained-water')];const compiled=await compileProjectShader(p);
  assert.equal(compiled.hlsl.split('maintained-port-proof').length-1,2);assert.ok(compiled.hlsl.includes('_MF_1_seed'));assert.ok(compiled.hlsl.includes('_MF_2_seed'));assert.ok(compiled.hlsl.includes('MF_graphic2_hash21'));
  module.files[module.hlslFile]=original;registerAsset('maintained-water',asset);const second=await compileProjectShader(p);assert.notEqual(second.sourceHash,compiled.sourceHash,'maintained source changes identify a different compiled implementation');
 }finally{unregisterAsset('maintained-water');}
});

test('a user-authored resource can bring its own Unity implementation without adding a framework profile',async()=>{
 const draft={schema:AUTHORING_SCHEMA,name:'User graphic',formula:{kind:'expression',source:'amount'},parameters:[{variable:'amount',min:0,max:1,step:.01,default:.3}],helpers:''};
 const asset=assetFromAuthoring(draft);asset.engineShaders={unity:{schema:'momo.engine-shader/v1',id:'user-amount',kind:'graphic',sourceSignature:graphicShaderSignature(asset),target:{engine:'Unity',pipeline:'URP'},shaderFile:'Unity/Amount.shader',hlslFile:'Unity/Amount.hlsl',parameters:[{variable:'amount',slot:0,property:'_Amount'}],files:{'Unity/Amount.shader':'Shader "User/Amount" { Properties {_Amount("Amount",Float)=.3} SubShader{Pass{}} }','Unity/Amount.hlsl':'float4 Evaluate(float amount){return float4(amount,amount,amount,amount);}','Unity/parameters.json':JSON.stringify({schema:'momo.realtime-shader/v1',materialProperties:[{name:'_Amount',type:'Float',floatValue:.3}]})}}};
 registerAsset('user-independent-shader',asset);try{assert.equal(hasGraphicShader('user-independent-shader'),true);const result=await exportGraphicShader({type:'user-independent-shader',params:[.7]});const files=await decodeZIP(result.bytes);assert.equal(new TextDecoder().decode(files.get('Unity/Amount.hlsl')),asset.engineShaders.unity.files['Unity/Amount.hlsl']);}finally{unregisterAsset('user-independent-shader');}
 asset.definition.outputs.scalar.inline='return 0.;';assert.equal(graphicUnityModule(asset),null,'changing the algorithm invalidates its old implementation');
});

test('postprocess dependencies travel with the native project and current settings import independently',async()=>{
 const p=project(),n=p.root.children[0];n.postEffects.swirl.enabled=true;n.postEffects.swirl.strength=4.5;const pack=await readResourcePack(await encodeResourcePack(p));
 try{const clean=sanitizeTree(pack.payload);assert.ok(clean.engineShaderModules.swirl.files[clean.engineShaderModules.swirl.shaderFile]);const result=await exportPostEffectShader('swirl',{values:n.postEffects.swirl,module:clean.engineShaderModules.swirl});assert.equal(JSON.parse(result.manifest.settings).strength,4.5);assert.equal(result.manifest.values.find(p=>p.variable==='strength').number,4.5);}finally{pack.rollback();}
});

test('formula JSON preserves its supplied implementation through the portable ABI wrapper',()=>{
 const asset=builtinAsset('Ring'),spec=asset.definition.outputs.scalar,draft=authoringFromEditor(asset,{name:'Shared ring',category:'Mine',description:''},spec.inline,spec.kind,asset.definition.parameters,scalarHelpers(asset));
 const restored=assetFromAuthoring(parseAuthoring(draft)),module=graphicUnityModule(restored);assert.ok(module);assert.equal(module.files[module.hlslFile],asset.engineShaders.unity.files[asset.engineShaders.unity.hlslFile]);
 const edited=authoringFromEditor(asset,{name:'Changed ring'},'return .5;','body',asset.definition.parameters,scalarHelpers(asset));assert.equal(edited.engineShaders,undefined);
});

test('offline module extraction verifies the resource and writes existing sources without a browser',async()=>{
 await mkdir('test-results/engine-module-extract',{recursive:true});const root=await mkdtemp(resolve('test-results/engine-module-extract/case-')),input=resolve(root,'project.zip'),output=resolve(root,'modules'),p=project();p.root.children[0].postEffects.blur.enabled=true;p.root.children[0].postFx[0]=7;await writeFile(input,await encodeResourcePack(p));
 const result=await extractEngineShaders(input,output),index=JSON.parse(await readFile(result.index,'utf8'));assert.ok(index.modules.some(m=>m.kind==='graphic'));assert.ok(index.modules.some(m=>m.effectId==='blur'));assert.equal(result.engineVerification,'not-run');for(const module of index.modules)assert.ok(module.files.some(name=>name.endsWith('.shader')));
});

test('MCP resource delivery exposes exact formal source files while keeping the inline response compact',async()=>{
 await mkdir('test-results/engine-module-mcp',{recursive:true});const directory=await mkdtemp(resolve('test-results/engine-module-mcp/case-')),sourceProject=resolve(directory,'source.zip'),bytes=await encodeResourcePack(project());await writeFile(sourceProject,bytes);
 const asset=builtinAsset('Ring'),module=graphicUnityModule(asset),bridge={expire(){},pages:new Map([['page',{}]])},service=new LiveProjectService(bridge,{runBrowser:async()=>({ok:true,asset})});service.snapshots.set('snapshot',{snapshotId:'snapshot',pageId:'page',directory,sourceProject,revision:createHash('sha256').update(bytes).digest('hex')});
 const result=(await service.resource('snapshot','Ring')).data;assert.equal(result.asset.engineShaders,undefined);assert.equal(result.asset.libraries,undefined);assert.equal(result.asset.definition.outputs,undefined);assert.equal(result.shaderModules.length,1);const hlsl=result.shaderModules[0].files.find(f=>f.endsWith('.hlsl'));assert.equal(await readFile(hlsl,'utf8'),module.files[module.hlslFile]);const stored=JSON.parse(await readFile(result.assetFile,'utf8'));assert.ok(stored.engineShaders.unity);assert.ok(stored.libraries['math-v1']);
 asset.definition.outputs.scalar.inline='return 0.;';assert.deepEqual((await service.resource('snapshot','Ring')).data.shaderModules,[],'a stale implementation is preserved on disk but not advertised for direct reuse');
});
