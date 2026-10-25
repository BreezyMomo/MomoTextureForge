import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryAuthoring} from '../web/library-authoring-export.js';
import {editResourceAliases} from '../web/resource-alias-edit.js';
import {builtinAsset} from '../web/resource-assets.js';
import {parseCreationAuthoring,assetFromCreationAuthoring} from '../web/creation-authoring.js';
import {assetFromGeneratorAuthoring,GENERATOR_EXAMPLE} from '../web/generator-authoring.js';
test('native formula and pipeline authoring exports roundtrip stable parameters and aliases',()=>{
 for(const asset of [builtinAsset('Circle'),assetFromGeneratorAuthoring(GENERATOR_EXAMPLE)]){
  const draft=libraryAuthoring(asset,{name:'Exported',aliases:{en:'Exported'},category:'Tests'}),next=assetFromCreationAuthoring(parseCreationAuthoring(draft));
  assert.equal(next.definition.name,'Exported');assert.equal(next.definition.aliases.en,'Exported');assert.deepEqual(next.definition.parameters.map(p=>p.variable),asset.definition.parameters.map(p=>p.variable));
 }
 assert.throws(()=>libraryAuthoring({kind:'image'},{}),/ZIP/);
});
test('alias edits preserve foreign aliases, stable formula bindings and defaults and reject unconfigured languages atomically',()=>{
 const asset=builtinAsset('Circle'),meta={name:'Circle',aliases:{en:'Circle',fr:'Cercle'},kind:'formula'},variable=asset.definition.parameters[0].variable;
 asset.definition.parameters[0].aliases.fr='Rayon';const before=JSON.stringify(asset);
 const result=editResourceAliases(asset,meta,{aliases:{en:'Round','zh-CN':'圆',},parameters:[{variable,aliases:{en:'Size','zh-CN':null}}]});
 assert.equal(result.meta.aliases.fr,'Cercle');assert.equal(result.asset.definition.parameters[0].aliases.fr,'Rayon');assert.equal(result.asset.definition.parameters[0].aliases.en,'Size');assert.equal(result.asset.definition.parameters[0].aliases['zh-CN'],undefined);
 assert.deepEqual(result.asset.definition.outputs,asset.definition.outputs);assert.deepEqual(result.asset.definition.defaults,asset.definition.defaults);assert.deepEqual(result.asset.libraries,asset.libraries);assert.equal(JSON.stringify(asset),before);
 assert.throws(()=>editResourceAliases(asset,meta,{aliases:{fr:'Changed'}}),/configured/);assert.throws(()=>editResourceAliases(asset,meta,{parameters:[{variable:'missing',aliases:{en:'No'}}]}),/Unknown/);
});
