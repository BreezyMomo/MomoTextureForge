import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILTIN} from '../web/definition-runtime.js';
import {exampleCatalog,exampleProject} from '../web/project-examples.js';
import {walk,sanitizeTree} from '../web/tree-model.js';

test('Starcore is the first editable composition and uses only built-in dependencies',()=>{
 const first=exampleCatalog()[0];assert.equal(first.id,'examples.starcoreCollapse.name');assert.equal(first.category,'composition');
 const p=sanitizeTree(exampleProject(first.id)),shapes=[];walk(p.root,n=>{assert.ok(BUILTIN.catalog.some(d=>d.id===n.type));if(n.kind==='shape')shapes.push(n);});
 assert.equal(p.output.seconds,6);assert.equal(p.output.loopExport,true);assert.equal(shapes.length,4);
 const ids=['StarcoreNebula','StarcoreAccretion','StarcoreCore','StarcoreArcs'];
 assert.deepEqual(shapes.map(n=>n.type),ids);assert.ok(!BUILTIN.catalog.some(d=>d.id==='StarcoreCollapse'));
 const engine=p.root.children[0].children[1];assert.equal(engine.postEffects.bloom.enabled,true);
 for(const [i,id]of ids.entries()){
  const d=BUILTIN.catalog.find(p=>p.id===id);assert.equal(d.usesTime,true);
  assert.deepEqual(d.parameters.map(p=>p.variable),['seed','loopDuration','sceneScale','exposure',['nebulaAmount','ringPower','corePower','sparkPower'][i]]);
  for(const p of d.parameters){assert.ok(p.aliases.en);assert.ok(p.aliases['zh-CN']);}
 }
});
