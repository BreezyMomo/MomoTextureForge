import test from 'node:test';
import assert from 'node:assert/strict';
import {project,sanitizeTree,exportDuration,exportFrameCount,exportFrameProgress,exportFrameSeconds} from '../web/tree-model.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('legacy projects retain fixed-rate sample count and endpoint behavior',()=>{
 const p=project();delete p.output.exportSeconds;p.output.seconds=3;p.output.fps=24;
 const loop=sanitizeTree(p).output;assert.equal(loop.exportSeconds,3);assert.equal(loop.frames,72);near(exportFrameProgress(loop,71),71/72);
 p.output.loopExport=false;const end=sanitizeTree(p).output;assert.equal(end.frames,73);assert.equal(exportFrameProgress(end,72),1);
 const fractional={seconds:.11,fps:30,loopExport:false};assert.equal(exportFrameCount(fractional),5);assert.equal(exportFrameProgress(fractional,4),1);assert.equal(exportFrameSeconds(fractional,4),.11);
 p.output.seconds=10;p.output.fps=60;assert.equal(sanitizeTree(p).output.frames,601);
 delete p.output.fps;p.output.frames=31;p.output.seconds=3;assert.equal(sanitizeTree(p).output.fps,10);
});
test('export duration counts frames while animation cycle controls repeated and partial-cycle progress',()=>{
 const o={seconds:2,exportSeconds:6,fps:30,loopExport:true};assert.equal(exportFrameCount(o),180);
 assert.deepEqual([0,30,60,90,120,150].map(i=>exportFrameProgress(o,i)),[0,.5,0,.5,0,.5]);
 assert.deepEqual([0,30,60,90,120,150].map(i=>exportFrameSeconds(o,i)),[0,1,2,3,4,5]);near(exportFrameProgress(o,179),59/60);
 o.loopExport=false;assert.equal(exportFrameCount(o),181);assert.equal(exportFrameSeconds(o,180),6);assert.equal(exportFrameProgress(o,180),1);assert.equal(exportFrameProgress(o,60),0);
 o.exportSeconds=3;assert.equal(exportFrameCount(o),91);assert.equal(exportFrameProgress(o,90),.5);
 o.exportSeconds=.5;assert.equal(exportFrameCount(o),16);assert.equal(exportFrameProgress(o,15),.25);
});
test('separate duration persists without changing cycle or FPS and importing old projects migrates once',()=>{
 const p=project();Object.assign(p.output,{seconds:2,exportSeconds:6,fps:30});const clean=sanitizeTree(p);assert.equal(clean.output.frames,180);
 clean.output.seconds=4;const edited=sanitizeTree(clean);assert.equal(edited.output.exportSeconds,6);assert.equal(edited.output.frames,180);near(exportFrameProgress(edited.output,60),.5);
 const legacy=project();delete legacy.output.exportSeconds;legacy.output.seconds=2;const migrated=sanitizeTree(legacy);migrated.output.seconds=4;assert.equal(sanitizeTree(migrated).output.exportSeconds,2);
 assert.equal(exportDuration({seconds:2}),2);assert.equal(sanitizeTree({...p,output:{...p.output,exportSeconds:Infinity}}).output.exportSeconds,2);
});
