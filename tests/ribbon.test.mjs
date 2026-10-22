import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILTIN} from '../web/definition-runtime.js';
import {builtinAsset,registerAsset,unregisterAsset} from '../web/resource-assets.js';
import {RIBBON_PRESETS,ribbonPresets,ribbonPresetParameters} from '../web/ribbon-presets.js';
import {node,project,sanitizeTree,evaluateNode} from '../web/tree-model.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {validateLibrary} from '../web/definition-schema.js';
import {ribbonWork} from '../web/ribbon-renderer.js';

test('ribbon rendering bounds work even when imported resources widen parameter ranges',()=>{
 assert.deepEqual(ribbonWork({strandCount:1e9,layerCount:1e9,waveCount:1e9,noiseFrequency:1e9},4096),{strands:1024,layers:4,steps:1024});
 assert.deepEqual(ribbonWork({strandCount:-1,layerCount:-1,waveCount:0,noiseFrequency:0},1),{strands:8,layers:1,steps:64});
});

test('all trail styles have independent valid presets and portable shader dependencies',async()=>{
 for(const type of ['FoldedRibbon','RefractionMembrane','ParticleStrands']){
  const asset=builtinAsset(type),definition=asset.definition,variables=new Set(definition.parameters.map(p=>p.variable));
  for(const preset of ribbonPresets(definition)){assert.ok(preset.aliases.en);assert.ok(Object.keys(preset.values).every(v=>variables.has(v)));const values=ribbonPresetParameters(definition,preset);for(const spec of definition.parameters)assert.ok(values[spec.slot]>=spec.min&&values[spec.slot]<=spec.max,type+' '+spec.variable);}
  asset.definition.name='Saved '+type;const id='asset_trail_'+type,p=project();let restored;
  try{registerAsset(id,asset);const n=node('shape',id),slot=definition.parameters.find(p=>p.variable==='motionSpeed').slot;n.tracks['params.'+slot]={keys:[[0,0],[1,1]],mode:'absolute',ease:'linear'};p.root.children=[n];restored=await readResourcePack(await encodeResourcePack(p));restored.register();const copy=sanitizeTree(restored.payload).root.children[0];assert.equal(evaluateNode(copy,.5).node.params[slot],.5);assert.deepEqual(restored.prepared[0][1].libraries,asset.libraries);}finally{restored?.rollback();unregisterAsset(id);}
 }
 const invalid=structuredClone(BUILTIN.definition);invalid.patterns.find(p=>p.id==='RefractionMembrane').generator.style='unknown';assert.throws(()=>validateLibrary(invalid),/样式/);
});

test('ribbon styles bind by stable variables and retain valid defaults',()=>{
 const def=BUILTIN.catalog.find(p=>p.id==='FoldedRibbon').definition;
 for(const preset of RIBBON_PRESETS){const values=ribbonPresetParameters(def,preset);assert.ok(preset.aliases['zh-CN']&&preset.aliases.en);for(const spec of def.parameters){assert.ok(spec.aliases.en);assert.ok(values[spec.slot]>=spec.min&&values[spec.slot]<=spec.max);}}
 const broken=structuredClone(BUILTIN.definition);delete broken.patterns.find(p=>p.id===def.id).generator.programs.path;assert.throws(()=>validateLibrary(broken),/轨迹/);
});

test('ribbon extended controls animate and survive project and portable resource round trips',async()=>{
 const p=project(),n=node('shape','FoldedRibbon');p.root.children=[n];n.params[16]=1;n.tracks['params.17']={keys:[[0,0],[1,1]],mode:'absolute',ease:'linear'};
 const copy=sanitizeTree(JSON.parse(JSON.stringify(p)));assert.equal(copy.root.children[0].params[16],1);assert.equal(evaluateNode(copy.root.children[0],.5).node.params[17],.5);
 const asset=builtinAsset('FoldedRibbon'),id='asset_ribbon_roundtrip';asset.definition.name='Saved ribbon';let restored;
 try{registerAsset(id,asset);p.root.children=[node('shape',id)];restored=await readResourcePack(await encodeResourcePack(p));assert.equal(restored.prepared[0][1].definition.generator.effect,'ribbon');assert.ok(restored.prepared[0][1].libraries['generator-ribbon-path-v1']);assert.deepEqual(restored.prepared[0][1].definition.parameters,asset.definition.parameters);}finally{restored?.rollback();unregisterAsset(id);}
});
