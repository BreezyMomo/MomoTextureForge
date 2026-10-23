import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATIVE_EFFECTS} from '../web/creative-effect-specs.js';
import {EFFECT_IDS,effectDefaults,effectOrder,effectsUseTime} from '../web/post-effect-specs.js';
import {node,project,sanitizeTree,evaluateNode,cloneNode,animationType} from '../web/tree-model.js';
import {animatablePaths} from '../web/animation-editing.js';
import {pixelSortMap,pixelSortSize} from '../web/pixel-sort-fx.js';
import {effectMargins} from '../web/render-bounds.js';

test('all ten creative effects extend old stacks without enabling themselves or sharing defaults',()=>{
 const old=['blur','bloom','sharpen','chromatic','posterize','pixelate','vignette','scanline','kaleidoscope','mirror','swirl','edge','tricolor','radialMask','unblack','normal','sketch'];
 const p=project();delete p.root.children[0].postEffects;delete p.root.children[0].effectOrder;
 const restored=sanitizeTree(p).root.children[0];assert.deepEqual(restored.effectOrder.slice(0,17),old);
 assert.equal(new Set(EFFECT_IDS).size,31);assert.equal(CREATIVE_EFFECTS.length,10);
 for(const spec of CREATIVE_EFFECTS){assert.equal(restored.postEffects[spec.id].enabled,false);const a=effectDefaults(),b=effectDefaults();a[spec.id].mix=.4;assert.equal(b[spec.id].mix,1);}
 assert.deepEqual(effectOrder(['pixelSort','ascii','missing','pixelSort']).slice(0,2),['pixelSort','ascii']);
});

test('creative numeric, color, boolean and select tracks survive saving and component copying',()=>{
 const p=project(),n=p.root.children[0],paths=animatablePaths(n);
 for(const spec of CREATIVE_EFFECTS){
  n.postEffects[spec.id].enabled=true;
  for(const param of spec.parameters){assert.ok(paths.includes('postEffects.'+spec.id+'.'+param.key));assert.equal(animationType(n,'postEffects.'+spec.id+'.'+param.key),param.type==='color'?'color':param.type==='boolean'||param.options?'discrete':'number');}
 }
 n.effectOrder=effectOrder(CREATIVE_EFFECTS.map(s=>s.id).reverse());
 n.tracks['postEffects.halftone.dotSize']={keys:[[0,8],[1,24]],ease:'linear'};
 n.tracks['postEffects.dither.paletteMode']={keys:[[0,0],[1,3]],ease:'hold'};
 n.tracks['postEffects.ascii.colored']={keys:[[0,true],[1,false]],ease:'hold'};
 n.tracks['postEffects.bevel.lightColor']={keys:[[0,'#ff0000'],[1,'#0000ff']],ease:'linear'};
 const copy=cloneNode(sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0]),sample=evaluateNode(copy,.5).node;
 assert.deepEqual(copy.postEffects,n.postEffects);assert.deepEqual(copy.effectOrder,n.effectOrder);
 assert.equal(sample.postEffects.halftone.dotSize,16);assert.equal(sample.postEffects.dither.paletteMode,0);assert.equal(sample.postEffects.ascii.colored,true);assert.match(sample.postEffects.bevel.lightColor,/^#[0-9a-f]{6}$/);
 sample.postEffects.halftone.dotSize=3;assert.equal(copy.postEffects.halftone.dotSize,8);
});

test('invalid creative settings clamp without corrupting other effects',()=>{
 const p=project(),n=p.root.children[0];n.postEffects.kuwahara.paintRadius=Infinity;n.postEffects.kuwahara.quality=99;n.postEffects.halftone.inkColor='garbage';n.postEffects.glitch.seed=-20;
 const clean=sanitizeTree(p).root.children[0];assert.equal(clean.postEffects.kuwahara.paintRadius,8);assert.equal(clean.postEffects.kuwahara.quality,2);assert.equal(clean.postEffects.halftone.inkColor,'#202020');assert.equal(clean.postEffects.glitch.seed,1);
});

test('glitch and CRT refresh time-dependent caches and freeze at zero rate',()=>{
 for(const id of ['glitch','crt']){const n=node();n.postEffects[id].enabled=true;assert.equal(effectsUseTime(n),true);n.postEffects[id].rate=0;assert.equal(effectsUseTime(n),false);}
});

const options=()=>({...effectDefaults().pixelSort,lowThreshold:0,highThreshold:1,alphaThreshold:.1});
const pixels=values=>Float32Array.from(values.flatMap(v=>v===null?[0,0,0,0]:[v,v,v,1]));
const permutation=(map,w)=>Array.from({length:map.length/4},(_,i)=>i+Math.round(map[i*4]*w)+Math.round(map[i*4+1]*(map.length/4/w))*w);
test('pixel sorting is a true stable permutation, stops at holes and respects run length',()=>{
 const src=pixels([.7,.3,null,.8,.6]);assert.deepEqual(permutation(pixelSortMap(src,5,1,options()),5),[1,0,2,4,3]);
 assert.deepEqual(permutation(pixelSortMap(pixels([.5,.5,.2,.8]),4,1,options()),4),[2,0,1,3]);
 assert.deepEqual(permutation(pixelSortMap(pixels([.9,.7,.5,.3]),4,1,{...options(),span:2}),4),[1,0,3,2]);
 assert.deepEqual(permutation(pixelSortMap(src,5,1,{...options(),descending:true}),5),[0,1,2,3,4]);
});
test('sort thresholds, reversed thresholds and vertical runs have distinct semantics',()=>{
 const src=pixels([.7,.3,.1,.8,.6]);assert.deepEqual(permutation(pixelSortMap(src,5,1,{...options(),lowThreshold:.2}),5),[1,0,2,4,3]);
 assert.deepEqual(permutation(pixelSortMap(src,5,1,{...options(),lowThreshold:.8,highThreshold:.2}),5),[0,1,2,3,4]);
 assert.deepEqual(permutation(pixelSortMap(pixels([.9,.1,.4,.8,.2,.6]),2,3,{...options(),sortAxis:1}),2),[4,1,2,5,0,3]);
 const premultiplied=Float32Array.from([.3,.3,.3,.5,.4,.4,.4,1]);assert.deepEqual(permutation(pixelSortMap(premultiplied,2,1,options()),2),[1,0]);
});
test('hue and saturation sorting use unpremultiplied color',()=>{
 const src=Float32Array.from([0,0,1,1,1,0,0,1,0,1,0,1]);assert.deepEqual(permutation(pixelSortMap(src,3,1,{...options(),sortBy:1}),3),[1,2,0]);
 const sat=Float32Array.from([1,0,0,1,.5,.5,.5,1,1,.5,.5,1]);assert.deepEqual(permutation(pixelSortMap(sat,3,1,{...options(),sortBy:2}),3),[1,2,0]);
});
test('sorting analysis stays on the same logical grid at every export size and rejects excess work',()=>{
 assert.deepEqual(pixelSortSize({bounds:[0,0,1,1],aspect:1,w:128},2),[256,256]);
 assert.deepEqual(pixelSortSize({bounds:[0,0,1,1],aspect:1,w:4096},2),[256,256]);
 assert.deepEqual(pixelSortSize({bounds:[-.1,0,1.1,1],aspect:2},2),[615,256]);
 assert.throws(()=>pixelSortSize({bounds:[0,0,1,1],aspect:8},1),error=>error.messageKey==='fx.pixelSortBudget'||error.key==='fx.pixelSortBudget'||String(error).includes('fx.pixelSortBudget'));
});
test('moving effects reserve logical overflow margins without changing placements',()=>{
 const n=node();n.postEffects.glitch.enabled=true;n.postEffects.zoomBlur.enabled=true;
 const a=effectMargins(n,2);assert.ok(a[0]>0&&a[1]===a[0]*2);assert.deepEqual(n.transform,node().transform);
});
