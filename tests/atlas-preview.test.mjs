import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasPreviewDimensions,animationExportKind,exportPreviewKey} from '../web/atlas-preview.js';
test('atlas preview fits oversized delivery settings without changing frames or columns',()=>{
 assert.deepEqual(atlasPreviewDimensions(512,512,90,8),{width:128,height:128});
 assert.deepEqual(atlasPreviewDimensions(64,32,9,3),{width:64,height:32});
 const frame=atlasPreviewDimensions(4096,512,2000,32);assert.ok(frame.width<=128);assert.ok(frame.width*32<=2048);assert.ok(frame.height*Math.ceil(2000/32)<=2048);assert.ok(frame.width*frame.height*2000<=4194304);
});

test('preview belongs to each animation export and becomes stale when its actual settings change',()=>{
 const p={output:{seconds:2,exportSeconds:6,fps:30,columns:4,gif:{colors:256}}};const key=exportPreviewKey(p,'atlas');assert.equal(key,exportPreviewKey(structuredClone(p),'atlas'));
 for(const format of ['gif','frames','atlas','atlas-exr','batch-atlas'])assert.equal(animationExportKind(format),true);for(const format of ['png','exr','atlas-preview'])assert.equal(animationExportKind(format),false);
 p.output.fps=24;assert.notEqual(key,exportPreviewKey(p,'atlas'));assert.notEqual(exportPreviewKey(p,'gif'),exportPreviewKey(p,'atlas'));assert.notEqual(exportPreviewKey(p,'batch-atlas',64),exportPreviewKey(p,'batch-atlas',256));
});
