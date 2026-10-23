import test from 'node:test';
import assert from 'node:assert/strict';
import {NOISE_WARP_SPEC,noiseWarpMotion,noiseWarpActive} from '../web/noise-warp.js';
import {EFFECT_IDS,effectDefaults,effectOrder,effectsUseTime,effectParameterVisible} from '../web/post-effect-specs.js';
import {node,project,sanitizeTree,evaluateNode,cloneNode,animationType,expandInstances} from '../web/tree-model.js';
import {animatablePaths} from '../web/animation-editing.js';
import {effectMargins} from '../web/render-bounds.js';
import {noiseWarpSamples} from '../web/noise-warp-samples.js';
const defaults=()=>effectDefaults().noiseWarp;
test('noise distortion appends one stable effect without replacing glitch or old ordering',()=>{
 const n=node(),saved=n.effectOrder.filter(id=>id!=='noiseWarp');assert.equal(EFFECT_IDS.length,28);assert.equal(saved.length,27);
 assert.deepEqual(effectOrder(saved),[...saved,'noiseWarp']);assert.equal(n.postEffects.noiseWarp.enabled,false);assert.equal(n.postEffects.glitch.enabled,false);assert.notEqual(n.postEffects.glitch,n.postEffects.noiseWarp);
 assert.equal(new Set(NOISE_WARP_SPEC.parameters.map(p=>p.key)).size,NOISE_WARP_SPEC.parameters.length);const a=defaults(),b=defaults();a.seed=9;assert.equal(b.seed,1);
});
test('continuous movement uses physical speed, direction and absolute time, not frame history',()=>{
 const v={...defaults(),motionAngle:0,motionSpeed:20};assert.deepEqual(noiseWarpMotion(v,2.5),[50,0]);
 assert.deepEqual(noiseWarpMotion(v,-2.5),[-50,-0]);const first=noiseWarpMotion(v,1.7);noiseWarpMotion(v,800);assert.deepEqual(noiseWarpMotion(v,1.7),first);
 const up=noiseWarpMotion({...v,motionAngle:90},1);assert.ok(Math.abs(up[0])<1e-12);assert.equal(up[1],20);
});
test('closed trajectories match positions and velocity across endpoints; playback loop is unrelated',()=>{
 const v={...defaults(),warpMotion:1,loopSeconds:3.6,motionAngle:23};assert.deepEqual(noiseWarpMotion(v,0),noiseWarpMotion(v,3.6));
 for(const t of [-.7,.4,1.1]){const a=noiseWarpMotion(v,t),b=noiseWarpMotion(v,t+3.6);a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<1e-11));}
 const eps=1e-6,a=noiseWarpMotion(v,eps),b=noiseWarpMotion(v,-eps);a.forEach((x,i)=>assert.ok(Math.abs(x+b[i])<1e-9));
 assert.notDeepEqual(noiseWarpMotion({...v,warpMotion:0},0),noiseWarpMotion({...v,warpMotion:0},3.6));
});
test('zero strength, zero mix and zero speed avoid animation and reserve no displacement margins',()=>{
 const n=node(),v=n.postEffects.noiseWarp;v.enabled=true;assert.ok(effectsUseTime(n));
 v.motionSpeed=0;assert.equal(effectsUseTime(n),false);assert.deepEqual(noiseWarpMotion(v,200),[0,0]);v.motionSpeed=24;
 v.mix=0;assert.equal(noiseWarpActive(v),false);assert.equal(effectsUseTime(n),false);assert.deepEqual(effectMargins(n),[0,0]);
 v.mix=1;v.warpX=v.warpY=0;assert.equal(noiseWarpActive(v),false);assert.equal(effectsUseTime(n),false);assert.deepEqual(effectMargins(n),[0,0]);
});
test('displacement margins account separately for both axes, mix and canvas aspect',()=>{
 const n=node();Object.assign(n.postEffects.noiseWarp,{enabled:true,warpX:32,warpY:8,mix:.5});
 assert.deepEqual(effectMargins(n,2),[8/512,4/512]);assert.deepEqual(effectMargins(n,.5),[16/512,2/512]);
});
test('settings sanitize and all controls animate by stable paths through saved group components',()=>{
 const p=project(),g=node('group');g.children=p.root.children;p.root.children=[g];Object.assign(g.postEffects.noiseWarp,{enabled:true,warpMode:2,warpMotion:1,loopSeconds:4,seed:987,warpX:999,warpDetail:99});g.effectOrder=effectOrder(['noiseWarp','blur']);
 g.tracks['postEffects.noiseWarp.warpY']={keys:[[0,4],[1,28]],ease:'linear'};g.tracks['postEffects.noiseWarp.warpMode']={keys:[[0,0],[1,2]],ease:'hold'};
 const restored=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0],copy=cloneNode(restored),sample=evaluateNode(copy,.5).node;
 assert.equal(copy.postEffects.noiseWarp.warpX,64);assert.equal(copy.postEffects.noiseWarp.warpDetail,5);assert.equal(sample.postEffects.noiseWarp.warpY,16);assert.equal(sample.postEffects.noiseWarp.warpMode,0);assert.equal(copy.postEffects.noiseWarp.warpY,4);assert.deepEqual(copy.postEffects,restored.postEffects);assert.deepEqual(copy.effectOrder,restored.effectOrder);
 for(const spec of NOISE_WARP_SPEC.parameters){const path='postEffects.noiseWarp.'+spec.key;assert.ok(animatablePaths(g).includes(path));assert.equal(animationType(g,path),spec.options?'discrete':'number');}
 g.arrange[0]=1;const expanded=expandInstances(p.root,g.id,0).children[0];assert.equal(expanded.postEffects.noiseWarp.enabled,true);assert.ok(expanded.children.every(c=>!c.postEffects.noiseWarp.enabled));
});
test('loop duration is conditional and three editable examples distinguish continuous and seamless motion',()=>{
 const param={path:'postEffects.noiseWarp.loopSeconds'};assert.equal(effectParameterVisible(param,{warpMotion:0}),false);assert.equal(effectParameterVisible(param,{warpMotion:1}),true);
 const samples=noiseWarpSamples();assert.equal(samples.length,3);
 for(const [i,s]of samples.entries()){const [original,warped]=s.root.children;assert.equal(original.postEffects.noiseWarp.enabled,false);assert.equal(warped.postEffects.noiseWarp.enabled,true);assert.equal(warped.postEffects.noiseWarp.warpMode,i);assert.equal(warped.children.length,3);assert.ok(warped.children.every(c=>c.shapeClock.follow===false&&!Object.keys(c.tracks).length));assert.equal(s.output.loopExport,i>0);if(i>0)assert.equal(s.output.seconds,warped.postEffects.noiseWarp.loopSeconds);}
});
