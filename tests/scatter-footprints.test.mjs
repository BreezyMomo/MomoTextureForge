import test from 'node:test';import assert from 'node:assert/strict';
import {alphaFootprint} from '../web/scatter-footprints.js';
import {generateArrangement} from '../web/arrangement-layouts.js';
import {node} from '../web/tree-model.js';

test('alpha footprints ignore transparent padding, preserve offset and enclose sampled pixels',()=>{
 const w=64,p=new Uint8Array(w*w*4);for(let y=15;y<25;y++)for(let x=40;x<48;x++)p[(y*w+x)*4+3]=255;
 const f=alphaFootprint(p,w,w);assert.ok(f.radius<.16);assert.equal(f.x,44/w-.5);assert.equal(f.y,20/w-.5);
 for(let y=15;y<25;y++)for(let x=40;x<48;x++)assert.ok(Math.hypot((x+.5)/w-.5-f.x,(y+.5)/w-.5-f.y)<f.radius);
 assert.deepEqual(alphaFootprint(new Float32Array(16),2,2),{x:0,y:0,radius:0,empty:true});
 const float=Float32Array.from(p,v=>v/255);assert.deepEqual(alphaFootprint(float,w,w),f);
});
function circles(points,footprint){return points.map((p,i)=>{const f=footprint(i),c=Math.cos(p.turn),s=Math.sin(p.turn),size=Math.min(1,p.size);return {x:p.x+size*(c*f.x+s*f.y),y:p.y+size*(-s*f.x+c*f.y),r:size*f.radius};});}
test('actual selected footprints and actual random sizes pack densely without overlap including rotated offsets',()=>{
 const a=node().arrange;a[0]=7;a[3]=50;a[4]=.25;a[9]=.7;a[10]=180;a[18]=1.4;a[32]=.01;
 const footprint=i=>i%2?{x:.15,y:-.1,radius:.13}:{x:0,y:0,radius:.3};
 for(const wrap of [false,true]){const options={avoidOverlap:true,gap:.005,wrap,footprint},points=generateArrangement(a,options),c=circles(points,footprint);assert.equal(points.length,50);assert.deepEqual(points,generateArrangement(a,options));for(let i=0;i<c.length;i++)for(let j=0;j<i;j++){let x=c[i].x-c[j].x,y=c[i].y-c[j].y;if(wrap){x-=Math.round(x);y-=Math.round(y);}assert.ok(Math.hypot(x,y)+1e-10>=c[i].r+c[j].r+.005);}}
 const old=generateArrangement(a,{avoidOverlap:true});assert.ok(old.length<20);
});
test('visible packing handles density, empty content and saturation without reindexing choices',()=>{
 const a=node().arrange;a[0]=12;a[3]=15;a[4]=.2;a[32]=0;const seen=new Set();const options={avoidOverlap:true,density:(x,y)=>x>0?1:0,footprint:i=>{seen.add(i);return {x:0,y:0,radius:.2};}};
 const p=generateArrangement(a,options);assert.equal(p.length,15);assert.ok(p.every(p=>p.x>.5));assert.deepEqual([...seen],Array.from({length:15},(_,i)=>i));
 assert.equal(generateArrangement(a,{...options,density:()=>0}).length,0);
 a[0]=7;a[4]=2;assert.equal(generateArrangement(a,{avoidOverlap:true,footprint:()=>({x:0,y:0,radius:1})}).length,1);
 assert.equal(generateArrangement(a,{avoidOverlap:true,footprint:()=>({x:0,y:0,radius:0,empty:true})}).length,15);
});
