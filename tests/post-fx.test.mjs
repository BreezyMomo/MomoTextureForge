import test from 'node:test';
import assert from 'node:assert/strict';
import {project,node,sanitizeTree,evaluateNode,expandInstances} from '../web/tree-model.js';
import {fxDefaults,hasPostFx} from '../web/post-fx.js';
import {shapeVector,planPSD} from '../web/tree-psd.js';
import {POST_EFFECTS,EFFECT_IDS,effectEnabled,effectEnableValues,effectOrder} from '../web/post-effect-specs.js';
import {animatablePaths} from '../web/animation-editing.js';

test('node effect switches preserve old filters, validate saved order and retain disabled settings',()=>{
 const p=project(),n=p.root.children[0];n.postFx[0]=8;assert.ok(effectEnabled(n,'blur'));
 n.postEffects.blur.enabled=false;assert.equal(hasPostFx(n),false);assert.equal(n.postFx[0],8);
 n.postEffects.scanline.enabled=true;n.postEffects.scanline.density=9999;n.postEffects.scanline.color='bad';
 n.effectOrder=['unblack','blur','unblack','missing','normal'];
 const clean=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0];
 assert.equal(clean.postEffects.scanline.density,500);assert.equal(clean.postEffects.scanline.color,'#000000');
 assert.deepEqual(clean.effectOrder.slice(0,3),['unblack','blur','normal']);assert.equal(clean.effectOrder.length,17);
 assert.equal(clean.postEffects.blur.enabled,false);assert.equal(clean.postFx[0],8);
 assert.deepEqual(effectOrder(['unknown']),EFFECT_IDS);assert.equal(POST_EFFECTS.length,17);
 assert.equal(effectEnableValues(node(),'blur',true)['postFx.0'],4);
});

test('new effect parameters animate by stable paths and survive nested component serialization',()=>{
 const p=project(),group=node('group'),n=node();group.children=[n];p.root.children=[group];
 group.postEffects.swirl.enabled=true;group.effectOrder=['swirl',...EFFECT_IDS.filter(id=>id!=='swirl')];
 group.tracks['postEffects.swirl.radius']={keys:[[0,.2],[1,1.2]],ease:'linear'};
 group.tracks['postEffects.scanline.color']={keys:[[0,'#ff0000'],[1,'#0000ff']],ease:'linear'};
 group.tracks['postEffects.mirror.mirrorY']={keys:[[0,false],[1,true]],ease:'hold'};
 n.postEffects.unblack.enabled=true;
 const saved=sanitizeTree(JSON.parse(JSON.stringify(p))),copy=saved.root.children[0],evaluated=evaluateNode(copy,.5).node;
 assert.ok(Math.abs(evaluated.postEffects.swirl.radius-.7)<1e-9);assert.equal(copy.postEffects.swirl.radius,.7);
 assert.match(evaluated.postEffects.scanline.color,/^#[0-9a-f]{6}$/);assert.equal(evaluated.postEffects.mirror.mirrorY,false);
 assert.deepEqual(copy.effectOrder,group.effectOrder);assert.ok(copy.children[0].postEffects.unblack.enabled);
 assert.ok(animatablePaths(copy).includes('postEffects.swirl.radius'));assert.ok(animatablePaths(copy).includes('postEffects.scanline.color'));
 evaluated.postEffects.swirl.radius=1;assert.equal(copy.postEffects.swirl.radius,.7);
});

test('expanding an arrangement applies its effect stack once on the resulting group',()=>{
 const p=project(),n=p.root.children[0];n.arrange[0]=1;n.postEffects.swirl.enabled=true;n.effectOrder=effectOrder(['swirl','blur']);n.postFx[0]=3;
 const result=expandInstances(p.root,n.id,0),g=result.children[0];
 assert.equal(g.kind,'group');assert.ok(effectEnabled(g,'swirl'));assert.equal(g.effectOrder[0],'swirl');
 assert.ok(g.children.every(c=>!hasPostFx(c)));
});
test('post filters roundtrip, clamp and animate without mutating the source',()=>{
 const p=project(),n=p.root.children[0];delete n.postFx;
 assert.deepEqual(sanitizeTree(p).root.children[0].postFx,fxDefaults());
 n.postFx=[8,1,16,.6,1,4,5];n.tracks['postFx.0']={mode:'absolute',ease:'linear',keys:[[0,0],[1,16]]};
 const restored=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0];
 assert.deepEqual(restored.postFx,n.postFx);assert.equal(evaluateNode(restored,.25).node.postFx[0],4);assert.equal(restored.postFx[0],8);
 n.postFx[0]=Infinity;assert.equal(sanitizeTree(p).root.children[0].postFx[0],0);
});
test('filtered vector shapes and groups preserve their composite in PSD',()=>{
 const p=project(),n=p.root.children[0];n.color={mode:'own',fill:'solid',low:'#ffffff',high:'#ffffff'};n.params[3]=0;
 assert.ok(shapeVector(n,128,128));n.postFx[0]=8;assert.ok(hasPostFx(n));assert.equal(shapeVector(n,128,128),null);
 const group=node('group');group.postFx[1]=1;group.children=[n];p.root.children=[group];assert.equal(planPSD(p).stats.merged,1);
});
test('old projects keep original Sobel settings and new normal controls roundtrip',()=>{
 const p=project();for(const key of ['normalAlgorithm','normalFlipX','normalFlipY','normalInvert','normalSmooth'])delete p.output[key];
 let clean=sanitizeTree(p);assert.equal(clean.output.normalAlgorithm,'sobel');assert.equal(clean.output.normalSmooth,0);assert.equal(clean.output.normalFlipY,false);
 Object.assign(p.output,{normalAlgorithm:'scharr',normalFlipX:true,normalFlipY:true,normalInvert:true,normalSmooth:3});
 clean=sanitizeTree(JSON.parse(JSON.stringify(p)));for(const k of ['normalAlgorithm','normalFlipX','normalFlipY','normalInvert','normalSmooth'])assert.equal(clean.output[k],p.output[k]);
});
