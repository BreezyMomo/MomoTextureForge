import test from 'node:test';import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {CATALOG,BY_ID} from '../web/catalog.js';
import {project,sanitizeTree} from '../web/tree-model.js';
import {LIBRARY_PRESETS,libraryVisible,libraryAliases,libraryVariants,libraryVariantNode} from '../web/library-policy.js';
const removed=['DomeFalloff','Pyramid','Flipbook','Trail','RuneRing','MagicCircle','ChannelPack','ChevronStripe','Honeycomb','SDFRing','SquareGradient'];
test('redundant built-ins are absent on disk and in the registry; current indices are contiguous',async()=>{
 assert.equal(CATALOG.length,284);assert.equal(CATALOG.filter(p=>libraryVisible(p.id)).length,284);
 for(const id of removed){assert.equal(BY_ID.has(id),false);await assert.rejects(access(new URL(`../web/definitions/patterns/${id}`,import.meta.url)));}
 CATALOG.forEach((p,i)=>{assert.equal(BY_ID.get(p.id).index,i);assert.equal(p.definition.order,i);});
 assert.equal(libraryVisible('asset_custom'),true);
});
test('curated presets use current definitions and preserve active values through save/load',()=>{
 for(const preset of LIBRARY_PRESETS){
  const n=libraryVariantNode(preset.id);assert.equal(n.type,preset.type);assert.ok(BY_ID.has(n.type));
  assert.ok(libraryVariants(n.type).some(p=>p.id===preset.id));assert.ok(libraryAliases(n.type).includes(preset.alias));
  for(const [slot,value] of Object.entries(preset.params))assert.equal(n.params[slot],value);
  const p=project();p.root.children=[n];const restored=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0];
  for(const spec of BY_ID.get(n.type).parameters)assert.equal(restored.params[spec.slot],n.params[spec.slot]);
 }
 assert.equal(libraryVariantNode('honeycomb').params[1],.24);
 assert.equal(libraryVariantNode('narrow-ring').params[1],.0125);
 assert.throws(()=>libraryVariantNode('missing'));
});

test('reviewed names and data-map categories match their purpose',()=>{
 for(const [id,name,category] of [['Thorn','尖峰渐变','shape'],['Curl','旋度流场','vector']]){
  assert.equal(BY_ID.get(id).zh,name);assert.equal(BY_ID.get(id).definition.category,category);
 }
 const square=libraryVariantNode('square-gradient');assert.equal(square.type,'ShapeGradient');assert.deepEqual(square.params.slice(0,3),[1,.62,1]);
});

test("sigil category retains only web and vortex",()=>{assert.deepEqual(CATALOG.filter(p=>p.definition.category==="sigil").map(p=>p.id),["WebSigil","VortexGate"]);});
