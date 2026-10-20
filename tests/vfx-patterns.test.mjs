import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,BY_ID} from '../web/catalog.js';
import {BUILTIN} from '../web/definition-runtime.js';
import {project,node,sanitizeTree,evaluateNode,animationType} from '../web/tree-model.js';
import {builtinAsset,registerAsset,unregisterAsset,validateAsset} from '../web/resource-assets.js';
import {generatorGeometry} from '../web/generator-geometry.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {fragmentGLSL} from '../web/renderer.js';
import {authoringFromEditor} from '../web/ai-authoring.js';

const ids=['PlumeSmoke','LayeredFog','TurbulentFlame','BallisticSparks','BranchedLightning','BokehDust','FilmGrain'];
test('seven generator types append with explicit capability versions and extended parameters',()=>{
 assert.deepEqual(CATALOG.slice(-7).map(p=>p.id),ids);
 assert.equal(CATALOG[CATALOG.length-8].id,'NaturalWood');
 for(const id of ids){
  const type=BY_ID.get(id);
  assert.equal(type.categoryName,'特效素材');
  assert.equal(type.usesTime,false);
  assert.equal(type.definition.generator.schema,'momo.generator/v1');
  assert.ok(type.parameters.length>=13&&type.parameters.length<=64);
  assert.equal(type.parameters[0].label,'随机种子');
  assert.equal(type.definition.revision,1);
  const p=project();p.root.children=[node('shape',id)];
  for(const parameter of type.parameters)p.root.children[0].params[parameter.slot]=parameter.max;
  assert.deepEqual(sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0].params,p.root.children[0].params);
 }
});

test('generator resource packs preserve extended keyframes and every shader dependency',async()=>{
 const asset=builtinAsset('PlumeSmoke');asset.definition.name='保存的烟雾';
 const p=project();p.root.children=[node('shape','PlumeSmoke')];const n=p.root.children[0];n.type='custom_generator';n.params[17]=6;
 n.tracks['params.17']={mode:'absolute',ease:'linear',keys:[[0,2],[1,10]]};
 const pack=await readResourcePack(await encodeResourcePack(p,{assets:new Map([['custom_generator',asset]])}));
 try{pack.register();const restored=sanitizeTree(pack.payload).root.children[0];assert.equal(restored.params.length,26);assert.equal(restored.params[17],6);assert.equal(evaluateNode(restored,.5).node.params[17],6);assert.equal(animationType(restored,'params.0'),'discrete');const imported=pack.prepared[0][1];assert.deepEqual(imported.definition.generator,asset.definition.generator);assert.deepEqual(imported.libraries,asset.libraries);}finally{pack.rollback();}
});

test('unknown generator capabilities and duplicate bindings fail before rendering',()=>{
 for(const mutate of [a=>a.definition.generator.revision=99,a=>a.definition.generator.programs.color='missing',a=>a.definition.parameters[1].variable='seed',a=>a.definition.generator.schema='unknown']){const asset=builtinAsset('PlumeSmoke');mutate(asset);assert.throws(()=>validateAsset(asset));}
 assert.throws(()=>authoringFromEditor(builtinAsset('PlumeSmoke')),/资源包/);
 assert.ok(!fragmentGLSL([BY_ID.get('Circle').index]).includes('generatedTexture'));
});

test('CPU geometry is seeded, finite and bounded independently of imported control ranges',()=>{
 for(const id of ['PlumeSmoke','BallisticSparks','BranchedLightning']){
  const type=BY_ID.get(id),values=Object.fromEntries(type.parameters.map(p=>[p.variable,p.default]));
  const a=generatorGeometry(type.definition.generator.effect,values),b=generatorGeometry(type.definition.generator.effect,values);assert.ok(a.length>0);assert.deepEqual(a,b);assert.ok(a.every(Number.isFinite));
  const other=generatorGeometry(type.definition.generator.effect,{...values,seed:values.seed+1});assert.notDeepEqual(a,other);
  if(id==='PlumeSmoke')assert.equal(generatorGeometry('smoke',{...values,count:1e9}).length,2000*12);
 }
});
test('VFX resources carry their helper library when moved outside the builtin catalog',()=>{
 for(const id of ids){
  const asset=builtinAsset(id);
  for(const name of asset.definition.generator.libraries)assert.equal(asset.libraries[name],BUILTIN.libraries[name],id+' '+name);
  const imported='asset_vfx_'+id;
  try{
   registerAsset(imported,asset);
   const p=project();p.root.children=[node('shape',imported)];
   assert.equal(sanitizeTree(p).root.children[0].type,imported);
  }finally{unregisterAsset(imported);}
 }
});
