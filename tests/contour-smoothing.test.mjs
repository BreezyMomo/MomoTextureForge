import test from 'node:test';import assert from 'node:assert/strict';
import {pixelContours} from '../web/pixel-contours.js';
import {smoothContourPaths,preservesContourInterior,fitContourPathsIndividually} from '../web/contour-smoothing.js';
import {exportContourPSD} from '../web/tree-psd-contours.js';
import {project} from '../web/tree-model.js';
const disk=(w=40,h=40)=>Uint8Array.from({length:w*h},(_,i)=>((i%w+.5)-w/2)**2+(Math.floor(i/w)+.5-h/2)**2<(Math.min(w,h)*.35)**2?1:0);
const signed=p=>p.knots.reduce((a,k,i)=>{const q=p.knots[(i+1)%p.knots.length].points;return a+k.points[2]*q[3]-q[2]*k.points[3];},0);

test('smooth disk reduces anchors and emits continuous nonzero Bezier handles',()=>{
 const raw=pixelContours(disk(),40,40),fit=smoothContourPaths(raw.paths);assert.ok(fit.vertices<raw.vertices);assert.ok(fit.curves>0);assert.ok(fit.paths[0].knots.some(k=>k.linked&&k.points[0]!==k.points[2]));assert.ok(signed(fit.paths[0])*signed(raw.paths[0])>0);assert.equal(fit.paths[0].operation,raw.paths[0].operation);
});

test('rectangles, tiny islands and one-pixel strips retain exact sharp geometry',()=>{
 for(const [w,h,r]of [[20,10,new Uint8Array(200).fill(1)],[1,8,new Uint8Array(8).fill(1)],[2,2,Uint8Array.from([1,0,0,1])]]){const paths=pixelContours(r,w,h).paths;assert.deepEqual(smoothContourPaths(paths).paths,paths);}
});

test('outer and hole directions remain distinct; invalid tolerance is rejected',()=>{
 const region=disk();for(let y=16;y<24;y++)for(let x=16;x<24;x++)region[y*40+x]=0;const p=pixelContours(region,40,40).paths,fit=smoothContourPaths(p);assert.deepEqual(fit.paths.map(x=>x.operation),['combine','subtract']);assert.ok(signed(fit.paths[0])>0&&signed(fit.paths[1])<0);assert.throws(()=>smoothContourPaths(p,{tolerance:2}),/误差/);
});

test('antialias is allowed on the boundary but not in solid interior or distant exterior',()=>{
 const width=7,height=7,region=new Uint8Array(49);for(let y=1;y<6;y++)for(let x=1;x<6;x++)region[y*7+x]=1;
 const imageData={width,height,data:Uint8ClampedArray.from({length:49*4},(_,i)=>i%4===3&&region[Math.floor(i/4)]?255:0)};
 imageData.data[(1*7+1)*4+3]=150;assert.equal(preservesContourInterior(region,imageData,width,height),true);
 imageData.data[(3*7+3)*4+3]=150;assert.equal(preservesContourInterior(region,imageData,width,height),false);
});

test('a destructive curve rasterization falls back to the original region cache and paths',async()=>{
 const region=disk(),pixels=Float32Array.from({length:40*40*4},(_,i)=>i%4===3?region[Math.floor(i/4)]:1);
 let rasterized=0;const result=await exportContourPSD(project(),{width:40,height:40,smooth:true,samplingScale:1,render:()=>pixels,rasterize:(paths,width,height)=>{rasterized++;return {width,height,data:new Uint8ClampedArray(width*height*4)};}});
 assert.ok(rasterized>0);assert.equal(result.stats.smoothed,0);assert.equal(result.stats.preserved,1);assert.equal(result.imageData.data[(20*40+20)*4+3],255);assert.ok(result.warnings.at(-1).includes('保留原轮廓'));
});

test('one rejected outline does not restore the staircase of another valid outline',()=>{
 const a=pixelContours(disk(),40,40).paths[0],b={...a,bad:true,knots:a.knots.map(k=>({...k,points:k.points.map((v,i)=>v+(i%2?0:50))}))};
 const result=fitContourPathsIndividually([a,b],paths=>({bad:paths[0].bad}),(_,candidate)=>!candidate.bad);
 assert.equal(result.accepted,1);assert.equal(result.preserved,1);assert.notEqual(result.paths[0],a);assert.equal(result.paths[1],b);assert.ok(result.paths[0].knots.length<a.knots.length);
});

test('invalid supersampling budget fails before invoking the renderer',async()=>{
 let called=0;await assert.rejects(exportContourPSD(project(),{width:2048,height:2048,smooth:true,samplingScale:4,render:()=>{called++;}}),/预算/);assert.equal(called,0);
});

test('existing antialias coverage is not mistaken for opaque interior; substantive changes still fail',()=>{
 const width=7,height=7,region=new Uint8Array(49).fill(1),reference={width,height,data:new Uint8ClampedArray(49*4)},candidate={width,height,data:new Uint8ClampedArray(49*4)};
 for(let i=0;i<49;i++){reference.data[i*4+3]=150;candidate.data[i*4+3]=152;}
 assert.equal(preservesContourInterior(region,candidate,width,height,reference),true);candidate.data[(3*7+3)*4+3]=210;assert.equal(preservesContourInterior(region,candidate,width,height,reference),false);
});
