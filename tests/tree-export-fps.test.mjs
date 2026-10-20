import test from 'node:test';
import assert from 'node:assert/strict';
import {project,sanitizeTree,exportFrameCount,exportFrameProgress} from '../web/tree-model.js';
test('FPS derives sequence count and fixed-rate sample times',()=>{
 const p=project();p.output.seconds=3;p.output.fps=24;const loop=sanitizeTree(p).output;assert.equal(loop.frames,72);assert.equal(exportFrameProgress(loop,71),71/72);
 p.output.loopExport=false;const end=sanitizeTree(p).output;assert.equal(end.frames,73);assert.equal(exportFrameProgress(end,72),1);
 const fractional={seconds:.11,fps:30,loopExport:false};assert.equal(exportFrameCount(fractional),5);assert.equal(exportFrameProgress(fractional,4),1);
 p.output.seconds=10;p.output.fps=60;assert.equal(sanitizeTree(p).output.frames,601);
 delete p.output.fps;p.output.frames=31;p.output.seconds=3;assert.equal(sanitizeTree(p).output.fps,10);
});
