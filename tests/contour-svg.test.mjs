import test from 'node:test';
import assert from 'node:assert/strict';
import {project} from '../web/tree-model.js';
import {buildContourDocument,exportContourPSD} from '../web/tree-psd-contours.js';
import {exportContourSVG,contourDocumentSVG} from '../web/contour-svg.js';
import {readPsd,initializeCanvas} from 'ag-psd';
initializeCanvas(()=>{throw Error('unexpected canvas');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
const render=(p,w,h)=>Float32Array.from({length:w*h*4},(_,i)=>{const x=(i/4|0)%w,y=(i/4/w|0);return i%4===3?+(x>=1&&x<w-1&&y>=1&&y<h-1&&!(x>=3&&x<5&&y>=3&&y<5)):i%4===0?1:0;});
test('SVG preserves shared PSD outline geometry, hole, color and opacity',async()=>{
 const p=project();p.root.children[0].opacity=.4;p.root.children[0].name='<icon & test>';const options={render,width:8,height:8,threshold:.5,smooth:false};
 const doc=await buildContourDocument(p,options),svg=await exportContourSVG(p,options),psd=await exportContourPSD(p,options),read=readPsd(psd.bytes,{useImageData:true,skipThumbnail:true});
 assert.equal(doc.stats.paths,2);assert.equal(read.children[0].vectorMask.paths.length,doc.children[0].vectorMask.paths.length);
 assert.equal(svg.svg,contourDocumentSVG(doc));assert.match(svg.svg,/fill-rule="evenodd"/);assert.match(svg.svg,/opacity="0.4"/);assert.match(svg.svg,/&lt;icon &amp; test&gt;/);assert.equal((svg.svg.match(/M/g)||[]).length,2);assert.match(svg.svg,/fill="#ff0000"/);
});
test('SVG refuses empty render, invalid threshold and nonfinite path values',async()=>{
 await assert.rejects(()=>exportContourSVG(project(),{render:(p,w,h)=>new Float32Array(w*h*4),width:8,height:8}),/可见区域/);
 await assert.rejects(()=>exportContourSVG(project(),{render,width:8,height:8,threshold:1}),/阈值/);
 assert.throws(()=>contourDocumentSVG({width:NaN,height:1,children:[]}),/坐标/);
});

test('oversized SVG reports measured size and raster alternative',()=>{
 const doc={width:1,height:1,children:[{name:'x'.repeat(2*1024*1024),vectorMask:{paths:[]},vectorFill:{color:{r:255,g:255,b:255}}}]};
 assert.throws(()=>contourDocumentSVG(doc),error=>/当前SVG约 2\.01 MB（上限 2\.00 MB）/.test(error.message)&&error.message.includes('直接使用图片')&&error.message.includes('PNG'));
});
