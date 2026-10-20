import test from 'node:test';
import assert from 'node:assert/strict';
import {denoiseContourCoverage} from '../web/contour-denoise.js';
test('coverage denoising reduces jagged edge variation without moving a straight boundary',()=>{
 const w=64,h=64,p=new Float32Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;p[k]=.25;p[k+3]=Math.max(0,Math.min(1,(x-30+(y%2?.7:-.7))/3+.5));}
 const original=p.slice(),out=denoiseContourCoverage(p,w,h,1),at=(a,x,y)=>a[(y*w+x)*4+3];
 assert.ok(Math.abs(at(out,30,30)-at(out,30,31))<Math.abs(at(p,30,30)-at(p,30,31))*.1);
 assert.ok(Math.abs((at(out,30,30)+at(out,30,31))/2-.5)<.01);
 assert.deepEqual(p,original);assert.equal(out[0],.25);assert.equal(denoiseContourCoverage(p,w,h,0),p);
});
test('coverage filtering preserves a broad ring hole and uniform/full-frame coverage',()=>{
 const w=64,p=new Float32Array(w*w*4);for(let y=0;y<w;y++)for(let x=0;x<w;x++){const r=Math.hypot(x-31.5,y-31.5);p[(y*w+x)*4+3]=r>10&&r<24?1:0;}
 const out=denoiseContourCoverage(p,w,w,1);assert.equal(out[(32*w+32)*4+3],0);assert.ok(out[(32*w+48)*4+3]>.99);
 const full=new Float32Array(16).fill(1);assert.deepEqual(denoiseContourCoverage(full,2,2,3),full);assert.throws(()=>denoiseContourCoverage(full,2,2,13));
});
