import test from 'node:test';
import assert from 'node:assert/strict';
import {node,PRESET_SCHEMA} from '../web/tree-model.js';
import {builtinAsset,resources} from '../web/resource-assets.js';
import {CATALOG} from '../web/catalog.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {graphicBundleCapabilities} from '../web/graphic-shader.js';

test('saved renamed graphics are identified by source without registering or changing resources',async()=>{
 const root=node('shape','Circle');root.type='archived_circle';root.params[0]=.39;root.tracks['params.0']={mode:'absolute',keys:[[0,.2],[1,.8]],ease:'linear'};
 const asset=builtinAsset('Circle');asset.definition.name='My circle';const payload={schema:PRESET_SCHEMA,root},before=JSON.stringify(payload),registry=[CATALOG.length,resources.size];
 const result=await graphicBundleCapabilities(await encodeResourcePack(payload,{assets:[[root.type,asset]]}),'formula');
 assert.equal(result.animated,true);assert.equal(result.shaderGraphic.type,'Circle');assert.equal(result.shaderGraphic.params[0],.39);assert.equal(JSON.stringify(payload),before);assert.deepEqual([CATALOG.length,resources.size],registry);
});
test('a claimed builtin name cannot mark a modified formula as offering its Shader',async()=>{
 const root=node('shape','Circle'),asset=builtinAsset('Circle');asset.definition.outputs.scalar.inline='.5';
 const result=await graphicBundleCapabilities(await encodeResourcePack({schema:PRESET_SCHEMA,root},{assets:[['Circle',asset]]}),'formula');assert.equal(result.shaderGraphic,null);
});
test('compositions retain animation badges without implying a whole-composition Shader',async()=>{
 const root=node('group');root.children=[node('shape','FlowingWater')];const result=await graphicBundleCapabilities(await encodeResourcePack({schema:PRESET_SCHEMA,root}),'composition');assert.equal(result.animated,true);assert.equal(result.shaderGraphic,null);
});
