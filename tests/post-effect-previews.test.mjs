import test from 'node:test';
import assert from 'node:assert/strict';
import {EFFECT_PREVIEWS} from '../web/post-effect-specimens.js';
import {POST_EFFECTS} from '../web/post-effect-specs.js';
test('every effect has a curated, bounded specimen without modifying node defaults',()=>{
 assert.deepEqual(Object.keys(EFFECT_PREVIEWS).sort(),POST_EFFECTS.map(s=>s.id).sort());
 assert.ok(new Set(Object.values(EFFECT_PREVIEWS).map(s=>s.art)).size>=8);
 for(const spec of POST_EFFECTS)for(const [key,value]of Object.entries(EFFECT_PREVIEWS[spec.id].values)){
  const p=spec.parameters.find(p=>p.key===key);assert.ok(p,spec.id+'.'+key);
  if(p.type==='boolean')assert.equal(typeof value,'boolean');
  else if(p.type==='color')assert.match(value,/^#[0-9a-f]{6}$/i);
  else assert.ok(value>=p.min&&value<=p.max,spec.id+'.'+key);
 }
 assert.equal(POST_EFFECTS.find(s=>s.id==='blur').parameters[0].default,0);
 assert.equal(EFFECT_PREVIEWS.dissolve.motion,true);assert.equal(EFFECT_PREVIEWS.shockwave.motion,true);assert.equal(EFFECT_PREVIEWS.liquidFusion.motion,true);
});
