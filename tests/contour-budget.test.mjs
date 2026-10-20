import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothContourPaths} from '../web/contour-smoothing.js';
import {buildContourDocument} from '../web/tree-psd-contours.js';
import {project} from '../web/tree-model.js';
test('large raw contours simplify without argument-stack overflow, retaining outer and hole paths',()=>{
 const ring=(radius,operation)=>({open:false,operation,knots:Array.from({length:130000},(_,i)=>{const t=i*2*Math.PI/130000,p=[100+radius*Math.cos(t),100+radius*Math.sin(t)];return {points:[...p,...p,...p]};})});
 const paths=[ring(80,'combine'),ring(30,'subtract')],fine=smoothContourPaths(paths,{tolerance:.25}),compact=smoothContourPaths(paths,{tolerance:1});
 assert.equal(compact.paths.length,2);assert.equal(compact.paths[1].operation,'subtract');assert.ok(compact.vertices<fine.vertices);assert.ok(fine.vertices<50000);assert.equal(paths[0].knots.length,130000);
});
test('complex output warns without rejecting valid geometry',async()=>{
 const render=(p,w,h)=>Float32Array.from({length:w*h*4},(_,i)=>i%4===3?+((((i/4|0)%w)+((i/4/w)|0))%2===0):1);
 const doc=await buildContourDocument(project(),{render,width:160,height:160,smooth:false});assert.equal(doc.stats.vertices,51200);assert.equal(doc.stats.paths,12800);assert.match(doc.stats.complexityWarning,/图形较复杂（51200 个锚点）/);assert.ok(doc.warnings.includes(doc.stats.complexityWarning));
 const small=await buildContourDocument(project(),{render,width:8,height:8,smooth:false});assert.equal(small.stats.complexityWarning,'');
 await assert.rejects(()=>buildContourDocument(project(),{render,width:8,height:8,detail:2}),/简化误差/);
});
