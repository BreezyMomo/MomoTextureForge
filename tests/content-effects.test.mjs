import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTENT_EFFECTS,contentEffectActive} from '../web/content-effects.js';
import {POST_EFFECTS,EFFECT_IDS,effectOrder,effectParameterVisible,effectsUseTime} from '../web/post-effect-specs.js';
import {node,project,sanitizeTree,cloneNode,evaluateNode,expandInstances,animationType} from '../web/tree-model.js';
import {animatablePaths} from '../web/animation-editing.js';
import {effectMargins} from '../web/render-bounds.js';
import {contentEffectSamples} from '../web/content-effect-samples.js';

test('content effects append stable IDs to existing saved stacks without enabling themselves',()=>{
 assert.deepEqual(EFFECT_IDS.slice(28),['dissolve','shockwave','liquidFusion']);
 assert.equal(POST_EFFECTS.length,31);assert.equal(new Set(EFFECT_IDS).size,31);
 const old=EFFECT_IDS.slice(0,28);assert.deepEqual(effectOrder(old),EFFECT_IDS);
 const a=node(),b=node();for(const {id}of CONTENT_EFFECTS){assert.equal(a.postEffects[id].enabled,false);a.postEffects[id].mix=.1;assert.equal(b.postEffects[id].mix,1);}
});
test('all content controls animate by stable paths and survive portable group serialization',()=>{
 const p=project(),g=node('group');g.children=[node()];p.root.children=[g];
 for(const {id,parameters}of CONTENT_EFFECTS){
  g.postEffects[id].enabled=true;
  for(const param of parameters){const path='postEffects.'+id+'.'+param.key;assert.ok(animatablePaths(g).includes(path));assert.equal(animationType(g,path),param.options?'discrete':param.type==='color'?'color':'number');}
 }
 g.effectOrder=effectOrder(['liquidFusion','dissolve','shockwave']);
 g.tracks['postEffects.dissolve.progress']={keys:[[0,0],[1,1]],ease:'linear'};
 g.tracks['postEffects.shockwave.progress']={keys:[[0,0],[1,1]],ease:'linear'};
 g.tracks['postEffects.dissolve.dissolvePattern']={keys:[[0,0],[1,2]],ease:'hold'};
 g.tracks['postEffects.liquidFusion.liquidColor']={keys:[[0,'#000000'],[1,'#ffffff']],ease:'linear'};
 const copy=cloneNode(sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0]),at=evaluateNode(copy,.5).node;
 assert.deepEqual(copy.effectOrder,g.effectOrder);assert.equal(at.postEffects.dissolve.progress,.5);assert.equal(at.postEffects.shockwave.progress,.5);assert.equal(at.postEffects.dissolve.dissolvePattern,0);assert.equal(at.postEffects.liquidFusion.liquidColor,'#808080');
 assert.deepEqual(copy.postEffects,g.postEffects);assert.equal(effectsUseTime(g),false);
 g.arrange[0]=1;const expanded=expandInstances(p.root,g.id,0).children[0];assert.ok(expanded.postEffects.liquidFusion.enabled);assert.ok(expanded.children.every(c=>!c.postEffects.liquidFusion.enabled));
});
test('invalid content settings clamp without enabling unrelated filters or mutating inputs',()=>{
 const p=project(),n=p.root.children[0];Object.assign(n.postEffects.dissolve,{progress:8,dissolvePattern:19,seed:-5});Object.assign(n.postEffects.liquidFusion,{fusionRadius:900,liquidColor:'invalid',fusionSoftness:-2});
 const clean=sanitizeTree(p).root.children[0];assert.equal(clean.postEffects.dissolve.progress,1);assert.equal(clean.postEffects.dissolve.dissolvePattern,2);assert.equal(clean.postEffects.dissolve.seed,1);assert.equal(clean.postEffects.liquidFusion.fusionRadius,64);assert.equal(clean.postEffects.liquidFusion.liquidColor,'#50dfc0');assert.equal(clean.postEffects.liquidFusion.fusionSoftness,.005);assert.equal(n.postEffects.dissolve.progress,8);assert.equal(clean.postEffects.noiseWarp.enabled,false);
});
test('zero gain, zero radius and shockwave endpoints bypass work and padding',()=>{
 const n=node();for(const id of ['dissolve','shockwave','liquidFusion']){const v=n.postEffects[id];v.enabled=true;v.mix=0;assert.equal(contentEffectActive(id,v),false);}
 assert.deepEqual(effectMargins(n),[0,0]);
 Object.assign(n.postEffects.shockwave,{mix:1,progress:0});assert.equal(contentEffectActive('shockwave',n.postEffects.shockwave),false);
 n.postEffects.shockwave.progress=1;assert.equal(contentEffectActive('shockwave',n.postEffects.shockwave),false);
 Object.assign(n.postEffects.liquidFusion,{mix:1,fusionRadius:0});assert.deepEqual(effectMargins(n),[0,0]);
 n.postEffects.dissolve.mix=1;n.postEffects.dissolve.progress=0;assert.equal(contentEffectActive('dissolve',n.postEffects.dissolve),false);
});
test('shockwave and fusion reserve aspect-correct sampling support in ordered combinations',()=>{
 const n=node();Object.assign(n.postEffects.shockwave,{enabled:true,progress:.4,displacement:32,mix:.5});Object.assign(n.postEffects.liquidFusion,{enabled:true,fusionRadius:16});
 assert.deepEqual(effectMargins(n,2),[16/512,32/512]);assert.deepEqual(effectMargins(n,.5),[32/512,16/512]);
});
test('only relevant style controls appear and their values survive hiding',()=>{
 const param=path=>({path:'postEffects.'+path});
 assert.equal(effectParameterVisible(param('dissolve.dissolveAngle'),{dissolvePattern:0}),false);assert.equal(effectParameterVisible(param('dissolve.dissolveAngle'),{dissolvePattern:2}),true);
 assert.equal(effectParameterVisible(param('dissolve.burnColor'),{dissolveStyle:0}),false);assert.equal(effectParameterVisible(param('dissolve.edgeWidth'),{dissolveStyle:1}),true);
 assert.equal(effectParameterVisible(param('liquidFusion.liquidColor'),{fusionColor:0}),false);assert.equal(effectParameterVisible(param('liquidFusion.liquidColor'),{fusionColor:1}),true);
});
test('editable comparisons use group effects over identical original sources and explicit progress tracks',()=>{
 const samples=contentEffectSamples();assert.equal(samples.length,3);
 samples.forEach((sample,i)=>{const [original,processed]=sample.root.children,id=CONTENT_EFFECTS[i].id;assert.equal(original.postEffects[id].enabled,false);assert.equal(processed.postEffects[id].enabled,true);assert.equal(original.children.length,processed.children.length);assert.equal(sample.output.loopExport,i===2);assert.ok(sample.output.seconds>0);assert.equal(sample.output.exportSeconds,sample.output.seconds);assert.equal(sample.output.fps,30);assert.ok(sample.previewTime>0&&sample.previewTime<1);if(i<2){const path='postEffects.'+id+'.progress';assert.equal(evaluateNode(processed,0).node.postEffects[id].progress,0);assert.equal(evaluateNode(processed,1).node.postEffects[id].progress,1);assert.ok(processed.tracks[path]);}else for(const child of processed.children)assert.deepEqual(evaluateNode(child,0).node.transform,evaluateNode(child,1).node.transform);});
});
