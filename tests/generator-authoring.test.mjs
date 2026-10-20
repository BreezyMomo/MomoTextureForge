import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY_GENERATOR,GENERATOR_EXAMPLE,parseGeneratorAuthoring,assetFromGeneratorAuthoring,generatorAuthoringFromAsset} from '../web/generator-authoring.js';
import {parseCreationAuthoring,assetFromCreationAuthoring} from '../web/creation-authoring.js';
import {AUTHORING_EXAMPLE} from '../web/ai-authoring.js';
import {registerAsset,unregisterAsset} from '../web/resource-assets.js';
import {encodeResourcePack,readResourcePack,GENERATOR_PACK_ABI} from '../web/resource-pack.js';
import {project,node,PRESET_SCHEMA} from '../web/tree-model.js';
import {stageResourceFiles} from '../web/resource-import.js';

const customGenerator=()=>structuredClone(GENERATOR_EXAMPLE);

test('custom generator JSON binds extended parameters and survives portable round trips',async()=>{
 const input=customGenerator();for(let i=3;i<22;i++)input.parameters.push({variable:'extra'+i,label:'额外'+i,min:0,max:1,step:.01,default:.2});
 const draft=parseCreationAuthoring('```json\n'+JSON.stringify(input)+'\n```'),asset=assetFromCreationAuthoring(draft);
 assert.equal(asset.definition.generator.effect,'pipeline');assert.equal(asset.definition.defaults.length,22);
 assert.equal(asset.definition.parameters[21].key,'P21');assert.equal(asset.definition.generator.passes[0].scale,.5);
 assert.deepEqual(generatorAuthoringFromAsset(asset,{name:draft.name,category:draft.category,description:draft.description}),draft);
 const id='asset_custom_generator';let pack;
 try{registerAsset(id,asset);const p=project();p.root.children=[node('shape',id)];const bytes=await encodeResourcePack(p);pack=await readResourcePack(bytes);pack.register();const restored=pack.prepared[0][1];assert.deepEqual(restored,asset);assert.equal(restored.definition.generator.passes.length,3);}finally{pack?.rollback();unregisterAsset(id);}
 assert.equal(GENERATOR_PACK_ABI,'momo-pattern/16-v1+generator-v1');
});

test('invalid generator graphs and source bindings are rejected before GPU compilation',()=>{
 const mutations=[d=>d.passes[0].inputs=['result'],d=>d.passes[1].id='shape',d=>d.passes[2].scale=.5,d=>d.passes[0].scale=2,d=>d.passes[1].inputs=[],d=>d.parameters[1].variable='input0',d=>d.parameters[1].variable='seed',d=>d.parameters[1].default=99,d=>d.scalar='unknown',d=>d.passes[0].source='#version 300 es\nvec4 generate(vec2 uv){return vec4(1);}',d=>d.passes=Array(17).fill(d.passes[0]),d=>d.parameters=[]];
 for(const mutate of mutations){const draft=customGenerator();mutate(draft);assert.throws(()=>parseGeneratorAuthoring(draft));}
 assert.throws(()=>parseGeneratorAuthoring('not json'),/有效JSON/);
 const empty=parseGeneratorAuthoring(EMPTY_GENERATOR);assert.equal(assetFromGeneratorAuthoring(empty).definition.generator.passes.length,1);
 assert.deepEqual(parseCreationAuthoring(JSON.stringify(AUTHORING_EXAMPLE)),parseCreationAuthoring(AUTHORING_EXAMPLE));
});

test('mixed formula and generator JSON files use the existing batch import path',async()=>{
 const files=[AUTHORING_EXAMPLE,customGenerator()].map((draft,i)=>({name:i+'.json',size:JSON.stringify(draft).length,text:async()=>JSON.stringify(draft)}));
 const staged=await stageResourceFiles(files,()=>{throw Error('JSON drafts should not render during file staging');});assert.equal(staged.length,2);
 assert.equal(assetFromCreationAuthoring(staged[0].draft).definition.generator,undefined);
 assert.equal(assetFromCreationAuthoring(staged[1].draft).definition.generator.effect,'pipeline');
});
