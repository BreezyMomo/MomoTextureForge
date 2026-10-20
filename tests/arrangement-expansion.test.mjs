import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeArrangement} from '../web/arrangement.js';
import {generateArrangement,densitySampler} from '../web/arrangement-layouts.js';
import {arrangementSamples} from '../web/authoring-samples.js';
import {sanitize,frameState,encodeHash,decodeHash} from '../web/state.js';
const config=mode=>sanitizeArrangement([mode]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('path arc-length spacing, reversal and zero-length paths',()=>{
 const a=config(6);a.splice(20,8,-1,0,-1/3,0,1/3,0,1,0);a[3]=9;
 const pts=generateArrangement(a);assert.equal(pts.length,9);
 for(let i=1;i<pts.length;i++)assert.ok(Math.abs(dist(pts[i],pts[i-1])-a[5]*2/8)<1e-6);
 a[28]=1;a[29]=0;const reverse=generateArrangement(a);assert.ok(reverse[0].x>reverse.at(-1).x);
 a[30]=1;a[31]=.1;assert.equal(generateArrangement(a).length,8);
 a.fill(0,20,28);assert.equal(generateArrangement(a).length,1);
});
test('Poisson scatter is deterministic and keeps minimum distance including rotated periodic boundaries',()=>{
 const a=config(7);a[3]=100;a[32]=.08;
 const points=generateArrangement(a);assert.deepEqual(points,generateArrangement(a));
 for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)assert.ok(dist(points[i],points[j])>=a[32]-1e-8);
 a[11]=5;assert.notDeepEqual(points,generateArrangement(a));a[5]=.8;a[6]=33;
 const tiled=generateArrangement(a,{seamless:true});
 for(let i=0;i<tiled.length;i++)for(let j=0;j<i;j++){const dx=Math.abs(tiled[i].x-tiled[j].x),dy=Math.abs(tiled[i].y-tiled[j].y);assert.ok(Math.hypot(Math.min(dx,1-dx),Math.min(dy,1-dy))>=a[32]-1e-8);}
 a[32]=1;assert.ok(generateArrangement(a).length<a[3]);
});
test('rings, mirrored pairs, regular spiral and hex lattice geometry',()=>{
 const rings=config(8);rings[33]=3;rings[58]=0;rings[3]=8;assert.equal(generateArrangement(rings).length,24);
 rings[3]=256;assert.equal(generateArrangement(rings).length,255);
 const symmetry=config(10);symmetry[3]=5;const pairs=generateArrangement(symmetry);assert.equal(pairs.length,10);assert.equal(pairs[0].mirror,1);assert.equal(pairs[1].mirror,-1);assert.ok(Math.abs(pairs[0].y+pairs[1].y-1)<1e-6);
 const spiral=config(9);spiral[3]=30;const ps=generateArrangement(spiral);assert.equal(ps.length,30);assert.ok(Math.abs(Math.hypot(ps.at(-1).x-.5,ps.at(-1).y-.5)-spiral[5])<1e-6);
 const hex=config(11);hex[1]=3;hex[2]=3;const hs=generateArrangement(hex);assert.equal(hs.length,9);assert.ok(Math.abs(dist(hs[0],hs[1])-dist(hs[0],hs[3]))<1e-6);
 hex[38]=1;const vertical=generateArrangement(hex);assert.ok(Math.abs(vertical[0].x-hs[0].y)<1e-6);
});
test('density scatter follows sampled mask orientation, threshold and empty regions',()=>{
 const pixels=new Float32Array(4*4*4);for(let i=0;i<8;i++)pixels[i*4]=1;
 const sample=densitySampler(pixels,4);assert.equal(sample(0,.3),1);assert.equal(sample(0,-.3),0);
 const a=config(12);a[3]=60;a[32]=.02;const pts=generateArrangement(a,{density:sample});assert.equal(pts.length,60);assert.ok(pts.every(p=>p.y>=.5));
 assert.equal(generateArrangement(a,{density:()=>0}).length,0);a[40]=1;assert.equal(generateArrangement(a,{density:()=>1}).length,0);
});
test('all seven samples round trip with extended mask and density parameter keyframes',()=>{
 for(const sample of arrangementSamples()){
  const s=sanitize(sample.state),l=s.layers[0];assert.equal(l.arrange.length,59);assert.deepEqual(decodeHash(encodeHash(s)),s);
  l.mask='Circle';l.maskArrange=[...l.arrange];s.animation.tracks={'layers.0.arrange.20':[[0,-1],[3,1]],'layers.0.maskArrange.41':[[0,1],[3,3]],'layers.0.arrange.42':[[0,.2],[3,.5]]};
  const clean=sanitize(s);assert.equal(Object.keys(clean.animation.tracks).length,3);assert.equal(frameState(clean,1.5).state.layers[0].maskArrange[41],2);
  assert.ok(generateArrangement(l.arrange).every(p=>Object.values(p).every(Number.isFinite)));
 }
});

test('zero-distance scatter produces full finite deterministic populations with optional density',()=>{
 for(const mode of [7,12])for(const seamless of [false,true]){
  const a=config(mode);a[32]=0;a[3]=256;
  const points=generateArrangement(a,{seamless,density:()=>1});
  assert.equal(points.length,256);assert.ok(points.every(p=>Object.values(p).every(Number.isFinite)));
  assert.deepEqual(points,generateArrangement(a,{seamless,density:()=>1}));
 }
 const a=config(8);a[33]=1;a[3]=4;a[15]=.5;
 const points=generateArrangement(a);assert.ok(points.slice(1).every(p=>p.y>.5));
});
