import test from 'node:test';import assert from 'node:assert/strict';
import {pixelContours,occupiedPixels} from '../web/pixel-contours.js';
import {exportContourPSD,planContourPSD} from '../web/tree-psd-contours.js';
import {project,node} from '../web/tree-model.js';
import {readPsd,initializeCanvas} from 'ag-psd';
initializeCanvas(()=>{throw Error('unexpected canvas');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
const read=bytes=>readPsd(bytes,{useImageData:true,skipThumbnail:true});
const inside=(path,x,y)=>{let hit=false;const pts=path.knots.map(k=>k.points.slice(2,4));for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [a,b]=pts[i],[c,d]=pts[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;};
const contains=(paths,x,y)=>{let fill=false;for(const p of paths)if(inside(p,x,y))fill=p.operation!=='subtract';return fill;};

test('pixel outlines keep holes, nested islands, and separate diagonal contacts',()=>{
 const r=Uint8Array.from([1,0,0,1]),p=pixelContours(r,2,2);assert.equal(p.paths.length,2);assert.equal(p.vertices,8);
 const region=new Uint8Array(49).fill(1);for(let y=1;y<6;y++)for(let x=1;x<6;x++)region[y*7+x]=0;region[24]=1;
 const paths=pixelContours(region,7,7).paths;assert.deepEqual(paths.map(p=>p.operation),['combine','subtract','combine']);assert.equal(contains(paths,.5,.5),true);assert.equal(contains(paths,2.5,2.5),false);assert.equal(contains(paths,3.5,3.5),true);
});

test('independent point-in-polygon check matches every cell of 400 random occupancy maps',()=>{
 let seed=37;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let n=0;n<400;n++){const w=1+Math.floor(rand()*7),h=1+Math.floor(rand()*7),r=Uint8Array.from({length:w*h},()=>rand()>.5?1:0),{paths}=pixelContours(r,w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)assert.equal(contains(paths,x+.5,y+.5),!!r[y*w+x],`${n}:${x},${y}`);}
});

test('nonzero means alpha, including sub-byte alpha; threshold removes softer samples',()=>{
 const pix=Float32Array.from([1,1,1,0, .2,.4,.6,.00000001, .7,.8,.9,.6]);
 assert.deepEqual([...occupiedPixels(pix,3,1).region],[0,1,1]);assert.deepEqual([...occupiedPixels(pix,3,1,.5).region],[0,0,1]);assert.deepEqual(occupiedPixels(pix,3,1).color,{r:178,g:204,b:229});
});

test('PSD contour layers are actual filled vector paths, with opaque region caches and unchanged input',async()=>{
 const p=project();p.root.children[0].params[3]=.1;p.root.children[0].opacity=.6;p.output.mode='normal';const before=JSON.stringify(p);
 const pix=Float32Array.from([1,0,0,0, .2,.4,.6,.00000001, .7,.8,.9,.6, 1,0,0,0]);
 const result=await exportContourPSD(p,{width:2,height:2,render:()=>pix}),psd=read(result.bytes),layer=psd.children[0];
 assert.ok(layer.vectorFill);assert.ok(layer.vectorMask);assert.equal(layer.vectorMask.paths.length,2);assert.deepEqual([...layer.imageData.data].filter((_,i)=>i%4===3),[0,255,255,0]);assert.ok(Math.abs(layer.opacity-.6)<.005);assert.equal(result.stats.vectors,1);
 assert.ok(result.warnings.some(w=>w.includes('羽化')));assert.equal(JSON.stringify(p),before);
});

test('background is vector, complex mask result is one outline, and invisible regions are omitted',async()=>{
 const p=project(),mask=node();mask.blend='inverseMask';p.root.children.push(mask);p.output.alpha=false;p.output.background='#123456';
 const result=await exportContourPSD(p,{width:1,height:1,render:()=>Float32Array.from([0,1,0,.5])}),psd=read(result.bytes);assert.equal(psd.children.length,2);assert.ok(psd.children.every(l=>l.vectorFill));assert.equal(result.stats.vectors,2);assert.ok(result.warnings.some(w=>w.includes('遮罩')));
 assert.throws(()=>planContourPSD(p,{width:4096,height:4096}),/预算/);
});

test('complexity, invalid threshold, cancellation and empty result report explicit failures',async()=>{
 assert.throws(()=>pixelContours(Uint8Array.from([1]),1,1,{maxEdges:2}),/复杂/);assert.throws(()=>pixelContours(Uint8Array.from([1]),1,1,{maxVertices:3}),/锚点/);
 assert.throws(()=>occupiedPixels(new Float32Array(4),1,1,1),/阈值/);
 let called=0;await assert.rejects(exportContourPSD(project(),{render:()=>{called++;},check:()=>{throw Error('取消');}}),/取消/);assert.equal(called,0);
 await assert.rejects(exportContourPSD(project(),{width:1,height:1,render:()=>new Float32Array(4)}),/没有超过阈值/);
});

test('scalar opacity is excluded from threshold sampling and retained in the PSD',async()=>{
 const p=project();p.root.children[0].opacity=.2;const before=JSON.stringify(p);
 const result=await exportContourPSD(p,{width:2,height:2,threshold:.5,render:s=>{
  assert.equal(s.root.children[0].opacity,1);return Float32Array.from({length:16},()=>1);
 }});
 assert.ok(Math.abs(read(result.bytes).children[0].opacity-.2)<.005);assert.equal(JSON.stringify(p),before);
});
