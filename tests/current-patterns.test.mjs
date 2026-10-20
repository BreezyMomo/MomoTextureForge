import test from 'node:test';
import assert from 'node:assert/strict';
import {BY_ID} from '../web/catalog.js';
import {BUILTIN} from '../web/definition-runtime.js';
import {fragmentGLSL} from '../web/renderer.js';
import {newLayer,sanitize,defaults} from '../web/state.js';
test('main and branched lightning remain distinct original builtins',()=>{
  assert.ok(BY_ID.has('Lightning'));
  assert.ok(BY_ID.has('LightningBranch'));
  assert.notEqual(BUILTIN.sources[BY_ID.get('LightningBranch').definition.outputs.scalar.file],BUILTIN.sources[BY_ID.get('Lightning').definition.outputs.scalar.file]);
});

test('current catalog parameters round-trip and shaders use the current ABI',()=>{
  for(const type of BY_ID.values()){
    const id=type.id,s=defaults();s.layers[0]=newLayer(id);
    assert.deepEqual(sanitize(s).layers[0].params,s.layers[0].params,id);
    const code=fragmentGLSL([type.index],0,0);
    assert.ok(!/\bP\d+\b|\bu_time\b|\bu_res\b/.test(code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'')),id);
  }
  assert.deepEqual(BY_ID.get('Lightning').parameters.map(p=>p.label),['抖动幅度','抖动频率','线宽','种子','流动速度']);
});

test('vector and normal renders include only the required dependencies',()=>{
  for(const id of ['Curl','RadialFlow','HeightNormal','PositionGradient']){
    const shader=fragmentGLSL([BY_ID.get(id).index]);
    if(id==='RadialFlow')assert.match(shader,/return clamp\(ref_vector_RadialFlow/);
    else assert.ok(!shader.includes('return clamp(ref_vector_RadialFlow'),id);
    if(id==='Curl')assert.match(shader,/vec3 ref_vector_Curl\(/);
  }
});

test('controls remain meaningful and arrow/fresnel silhouettes remain correct',()=>{
  for(const [id,labels] of Object.entries({ChainArmor:['错行'],InkBleed:['墨团数']})){
    for(const label of labels)assert.ok(!BY_ID.get(id).parameters.some(p=>p.label===label),`${id}: ${label}`);
  }
  const formula=id=>BUILTIN.sources[BY_ID.get(id).definition.outputs.scalar.file];
  assert.match(formula('ArrowHead'),/1\.0 - clamp\(q.y \/ L/);
  assert.match(formula('FresnelMask'),/length\(p\) <= R/);
});
