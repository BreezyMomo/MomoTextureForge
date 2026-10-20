import test from 'node:test';
import assert from 'node:assert/strict';
import {node} from '../web/tree-model.js';
import {mappedKeyTimes,intervalChange} from '../web/tree-animation-workspace.js';
test('overview clock maps nested intervals and rejects hold discontinuities',()=>{
 const a=node('group'),b=node('shape');a.timing.start=.2;a.timing.end=.6;b.timing.start=.25;b.timing.end=.75;
 assert.ok(Math.abs(mappedKeyTimes([a,b],.5)[0]-.4)<1e-5);
 a.timing.start=0;a.timing.end=1;a.timing.loop=true;a.timing.cycles=2;
 const keys=mappedKeyTimes([a],.5);assert.equal(keys.length,2);assert.ok(Math.abs(keys[0]-.25)<1e-5);assert.ok(Math.abs(keys[1]-.75)<1e-5);
 a.timing.loop=false;a.timing.cycles=1;a.timing.ease='hold';assert.deepEqual(mappedKeyTimes([a],.5),[]);
 a.timing.frozen=true;a.timing.at=.5;assert.deepEqual(mappedKeyTimes([a],.5),[0]);
});
test('overview interval moves keep duration and handles cannot cross',()=>{
 const right=intervalChange(.2,.6,1),left=intervalChange(.2,.6,-1);assert.ok(Math.abs(right[0]-.6)<1e-12);assert.equal(right[1],1);assert.equal(left[0],0);assert.ok(Math.abs(left[1]-.4)<1e-12);
 assert.deepEqual(intervalChange(.2,.6,1,'start'),[.599,.6]);assert.deepEqual(intervalChange(.2,.6,-1,'end'),[.2,.201]);
});

import {intervalProjection} from '../web/animation-intervals.js';
const close=(actual,expected)=>{assert.equal(actual.length,expected.length);actual.forEach((r,i)=>r.forEach((v,j)=>assert.ok(Math.abs(v-expected[i][j])<1e-7,`${v} != ${expected[i][j]}`)));};
test('nested interval projections support affine scale, reverse and clipped parents',()=>{
 const parent=node('group');parent.timing.start=.2;parent.timing.end=.6;
 let p=intervalProjection([parent],.25,.75);close(p.ranges,[[.3,.5]]);assert.equal(p.editable,true);assert.ok(Math.abs(p.map.forward(.4)-.5)<1e-9);
 parent.timing.from=1;parent.timing.to=0;p=intervalProjection([parent],.1,.4);close(p.ranges,[[.44,.56]]);assert.equal(p.reversed,true);assert.equal(p.editable,true);
 parent.timing.from=.2;parent.timing.to=.8;p=intervalProjection([parent],0,.5);close(p.ranges,[[.2,.4]]);assert.equal(p.editable,false);
 close(intervalProjection([parent],0,.1).ranges,[]);
});
test('loop, pingpong, smooth and nonmonotonic curves show actual read-only spans',()=>{
 const p=node('group');p.timing.loop=true;p.timing.cycles=2;
 let view=intervalProjection([p],.2,.4);assert.equal(view.editable,false);close(view.ranges,[[.1,.2],[.6,.7]]);
 p.timing.pingpong=true;close(intervalProjection([p],.2,.4).ranges,[[.1,.2],[.8,.9]]);
 p.timing.loop=false;p.timing.cycles=1;p.timing.ease='smooth';close(intervalProjection([p],.15625,.84375).ranges,[[.25,.75]]);
 p.timing.ease='linear';p.timing.curve=[[0,0],[.5,1],[1,0]];close(intervalProjection([p],.2,.4).ranges,[[.1,.2],[.8,.9]]);
});
test('interval projection handles frozen, held, offset and short repeated clocks',()=>{
 const p=node('group');p.timing.frozen=true;p.timing.at=.3;close(intervalProjection([p],.2,.4).ranges,[[0,1]]);close(intervalProjection([p],.5,.8).ranges,[]);
 p.timing.frozen=false;p.timing.ease='hold';close(intervalProjection([p],.2,.4).ranges,[]);
 p.timing.ease='linear';p.timing.offset=.25;close(intervalProjection([p],.2,.4).ranges,[[0,.15],[.95,1]]);
 p.timing.offset=0;p.timing.start=.4;p.timing.end=.4001;p.timing.loop=true;p.timing.cycles=64;
 const spans=intervalProjection([p],.2,.4).ranges;assert.equal(spans.length,64);assert.ok(spans.every(([a,b])=>a>=.4&&b<=.4001&&b>a));
 const child=node('group');child.timing.loop=true;child.timing.cycles=2;
 assert.equal(intervalProjection([p,child],.2,.4).ranges.length,128);
});
