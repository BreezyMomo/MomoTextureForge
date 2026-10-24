import test from 'node:test';
import assert from 'node:assert/strict';
import rough from '../web/vendor/rough.js';
import {fitSketchLoop,cubicPoint} from '../web/sketch-smoothing.js';
import {sketchContours,createSketchContourTracer} from '../web/sketch-contours.js';
import {node,project,sanitizeTree,evaluateNode,cloneNode} from '../web/tree-model.js';

const raster=(size,predicate)=>{const a=new Float32Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++)a[(y*size+x)*4+3]=+predicate(x+.5,y+.5);return a;};
const ring=()=>raster(256,(x,y)=>{const r=Math.hypot(x-128,y-128);return r<112&&r>56;});
const ops=path=>rough.generator().path(path,{seed:1,roughness:.9}).sets.reduce((sum,set)=>sum+set.ops.length,0);

test('smoothing removes micro-segment brush noise without filling ring holes or moving the silhouette',()=>{
 const pixels=ring(),raw=sketchContours(pixels,256,256,{simplify:.2,smoothing:0}),smooth=sketchContours(pixels,256,256,{simplify:.2,smoothing:.5});
 assert.equal(smooth.loops.length,2);assert.equal((smooth.path.match(/M/g)||[]).length,2);assert.ok(ops(smooth.path)<ops(raw.path)*.15,'Smooth circles should use far fewer independently randomized strokes');
 for(const loop of smooth.loops){
  const curves=fitSketchLoop(loop,.5),expected=Math.hypot(loop[0][0]-256,loop[0][1]-256)>160?224:112;
  for(let i=0;i<curves.length;i++){
   const c=curves[i],next=curves[(i+1)%curves.length];assert.deepEqual(c[3],next[0]);
   const u=[c[3][0]-c[2][0],c[3][1]-c[2][1]],v=[next[1][0]-next[0][0],next[1][1]-next[0][1]];
   assert.ok((u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v))>.999,'Smooth joins must have continuous tangents');
   for(let t=0;t<=1;t+=.05){const p=cubicPoint(c,t);assert.ok(Math.abs(Math.hypot(p[0]-256,p[1]-256)-expected)<4,'Curve must remain close to the original circle');}
  }
 }
 assert.deepEqual(sketchContours(pixels,256,256,{simplify:.2,smoothing:0}),raw,'Zero smoothing preserves legacy paths');
});

test('real concave corners, narrow holes and separate islands survive smoothing',()=>{
 const pixels=raster(192,(x,y)=>{const u=Math.abs(x-96),v=y-24;return v>=0&&v<144&&u<Math.min(64,v+20,164-v)&&!(x>88&&x<104&&y>70&&y<118);});
 const plain=sketchContours(pixels,192,192,{simplify:.2,smoothing:0}),smooth=sketchContours(pixels,192,192,{simplify:.2,smoothing:1});
 assert.equal(smooth.loops.length,plain.loops.length);assert.ok(smooth.loops.length>=2);
 const square=[[0,0],[50,0],[100,0],[100,50],[100,100],[50,100],[0,100],[0,50]];
 const curves=fitSketchLoop(square,.5);for(const p of [[0,0],[100,0],[100,100],[0,100]])assert.ok(curves.some(c=>c[0][0]===p[0]&&c[0][1]===p[1]));
 assert.ok(curves.flat().every(p=>p.every(v=>v>=-1e-6&&v<=100.000001)),'Square corners must not round or overshoot');
 const islands=raster(128,(x,y)=>Math.hypot(x-35,y-64)<20||Math.hypot(x-95,y-64)<10);assert.equal(sketchContours(islands,128,128).loops.length,2);
});

test('alpha tracing reuses normalized silhouette data while luminance and geometry changes invalidate it',()=>{
 const trace=createSketchContourTracer(),pixels=ring(),v={smoothing:.5,source:0},a=trace(pixels,256,256,v);const recolor=pixels.slice();for(let i=0;i<recolor.length;i+=4)recolor[i]=.7;
 assert.equal(trace(recolor,256,256,{...v,seed:9,strokeWidth:4,roughness:3}),a);
 const changed=pixels.slice();changed[3]=1;assert.notEqual(trace(changed,256,256,v),a);
 assert.notEqual(trace(pixels,256,256,{...v,smoothing:0}),a);
 const lum=createSketchContourTracer(),b=lum(pixels,256,256,{source:1});assert.notEqual(lum(recolor,256,256,{source:1}),b);
 assert.notEqual(trace(pixels,256,256,v,{aspect:2}),a);
});

test('smoothing settings animate, sanitize and travel with saved nodes and components',()=>{
 const p=project(),n=p.root.children[0];assert.equal(n.postEffects.sketch.smoothing,.5);n.postEffects.sketch.smoothing=.8;
 n.tracks['postEffects.sketch.smoothing']={keys:[[0,0],[1,1]],ease:'linear'};const saved=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0];
 assert.equal(saved.postEffects.sketch.smoothing,.8);assert.equal(evaluateNode(saved,.25).node.postEffects.sketch.smoothing,.25);assert.equal(cloneNode(saved).postEffects.sketch.smoothing,.8);
 n.postEffects.sketch.smoothing=99;assert.equal(sanitizeTree(p).root.children[0].postEffects.sketch.smoothing,1);delete n.postEffects.sketch.smoothing;assert.equal(sanitizeTree(p).root.children[0].postEffects.sketch.smoothing,.5);
});

test('dense and changing boundaries have a bounded deterministic fit without iterative raster validation',()=>{
 for(let frame=0;frame<12;frame++){
  const points=Array.from({length:4096},(_,i)=>{const a=i/4096*Math.PI*2,r=180+4*Math.sin(a*7+frame*.2);return [256+r*Math.cos(a),256+r*Math.sin(a)];});
  const curves=fitSketchLoop(points,.5);assert.ok(curves.length<100);assert.deepEqual(fitSketchLoop(points,.5),curves);assert.ok(curves.flat(2).every(Number.isFinite));
 }
 assert.equal(fitSketchLoop([[0,0],[0,0],[0,0],[0,0],[0,0]],1),null);
});
