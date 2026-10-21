import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,sanitize,encodeHash,decodeHash,frameState} from '../web/state.js';
import {sanitizeArrangement,effectiveArrangement,defaultArrangement} from '../web/arrangement.js';
import {arrangeShortcut} from '../web/workspace-model.js';
test('spiral extension preserves legacy arrays and round trips extended animated mask parameters',()=>{
 assert.equal(defaultArrangement().length,16);
 const s=defaults(),l=s.layers[0];l.arrange[0]=5;l.mask='Circle';l.maskArrange[0]=5;
 let clean=sanitize(s);assert.equal(clean.layers[0].arrange.length,20);
 assert.equal(clean.layers[0].arrange[16],137.507764);
 for(const field of ['arrange','maskArrange'])for(const slot of [16,17,18,19])
  clean.animation.tracks[`layers.0.${field}.${slot}`]=[[0,slot===16?100:0],[3,slot===16?160:2]];
 clean=sanitize(clean);assert.equal(Object.keys(clean.animation.tracks).length,8);
 assert.deepEqual(decodeHash(encodeHash(clean)),clean);
 const at=frameState(clean,1.5).state;assert.equal(at.layers[0].arrange[16],130);assert.equal(at.layers[0].maskArrange[19],1);
 clean.layers[0].arrange[0]=0;assert.equal(sanitize(clean).layers[0].arrange[16],137.507764);
});
test('spiral footprint bounds outer growth and fill remains centered',()=>{
 const a=sanitizeArrangement([5]);a[4]=2;a[9]=.9;a[18]=3;
 const bounded=effectiveArrangement(a,true);assert.ok(bounded[4]*3*1.9<=.9/Math.SQRT2+1e-9);assert.equal(a[4],2);
 a[13]=.4;a[14]=-.2;const fit=arrangeShortcut(a,'fill');assert.equal(fit[13],0);assert.equal(fit[14],0);assert.equal(fit[16],137.507764);
 assert.equal(sanitizeArrangement([99]).length,59);
});

test('spiral supports 512 instances, independent mask counts and count animation',()=>{
 const s=defaults(),l=s.layers[0];l.arrange[0]=5;l.arrange[3]=999;l.mask='Circle';l.maskArrange[0]=5;l.maskArrange[3]=256;
 s.animation.tracks={'layers.0.arrange.3':[[0,64],[3,256]],'layers.0.maskArrange.3':[[0,256],[3,128]]};
 const clean=sanitize(s);assert.equal(clean.layers[0].arrange[3],512);assert.equal(clean.layers[0].maskArrange[3],256);
 assert.deepEqual(decodeHash(encodeHash(clean)),clean);
 const at=frameState(clean,1.5).state;assert.equal(at.layers[0].arrange[3],160);assert.equal(at.layers[0].maskArrange[3],192);
 clean.layers[0].arrange[0]=2;
 clean.animation.tracks['layers.0.arrange.0']=[[0,2],[3,5]];
 assert.equal(frameState(clean,0).state.layers[0].arrange[3],64);
 assert.equal(frameState(clean,3).state.layers[0].arrange[3],256);
 for(const mode of [1,2,3,4]) { const a=[...l.arrange];a[0]=mode;assert.equal(effectiveArrangement(a,false)[3],128); }
});
