import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageContours} from '../web/coverage-contours.js';
const field=(w,h,fn)=>Float32Array.from({length:w*h*4},(_,i)=>i%4===3?fn((i/4|0)%w,(i/4/w|0)):1);
test('interpolated straight edge stays on its subpixel location',()=>{
 const p=coverageContours(field(20,20,(x,y)=>Math.max(0,Math.min(1, .5+(x+.5-7.23)/20))),20,20,.5);
 const edge=p.paths[0].knots.map(k=>k.points).filter(p=>p[3]>=.5&&p[3]<=19.5&&p[2]<10);
 assert.ok(edge.length>0);for(const p of edge)assert.ok(Math.abs(p[2]-7.23)<1e-6);
});
test('coverage retains a hole and ordered winding',()=>{
 const {paths}=coverageContours(field(16,16,(x,y)=>{const r=Math.hypot(x-7.5,y-7.5);return r>3&&r<7?1:0;}),16,16);
 assert.deepEqual(paths.map(p=>p.operation),['combine','subtract']);
});
test('low diagonal islands stay separate and finite at exact threshold',()=>{
 const {paths}=coverageContours(field(2,2,(x,y)=>x===y?1:0),2,2);
 assert.equal(paths.length,2);for(const p of paths)for(const k of p.knots)assert.ok(k.points.every(Number.isFinite));
 assert.doesNotThrow(()=>coverageContours(field(4,4,(x)=>x===1?.5:x===2?1:0),4,4));
});
test('empty fields, document bounds and complexity limits',()=>{
 assert.equal(coverageContours(field(2,2,()=>0),2,2).paths.length,0);
 const p=coverageContours(field(4,4,()=>1),4,4);assert.equal(p.paths.length,1);assert.equal(p.paths[0].operation,'combine');
 for(const k of p.paths[0].knots)assert.ok(k.points.every(v=>v>=0&&v<=4));
 assert.throws(()=>coverageContours(field(4,4,()=>1),4,4,.5,{maxEdges:1}));
 assert.throws(()=>coverageContours(field(2,2,()=>1),2,2,0));
});
