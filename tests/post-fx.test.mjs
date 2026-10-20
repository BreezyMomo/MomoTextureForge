import test from 'node:test';
import assert from 'node:assert/strict';
import {project,node,sanitizeTree,evaluateNode,expandInstances} from '../web/tree-model.js';
import {fxDefaults,hasPostFx} from '../web/post-fx.js';
import {shapeVector,planPSD} from '../web/tree-psd.js';
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
