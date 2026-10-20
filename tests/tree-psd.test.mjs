import test from 'node:test';
import assert from 'node:assert/strict';
import {readPsd,initializeCanvas} from 'ag-psd';
import {project,node,evaluateNode} from '../web/tree-model.js';
import {planPSD,shapeVector,exportPSD,pixelData} from '../web/tree-psd.js';
initializeCanvas(()=>{throw Error('unexpected canvas');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
const read=bytes=>readPsd(bytes,{useImageData:true,skipThumbnail:true});
const solid=type=>{const n=node('shape',type);n.color={mode:'own',fill:'solid',high:'#1234ab',low:'#1234ab'};return n;};
const fake=(p,w,h,time=0)=>{
 function sample(original,t){const e=evaluateNode(original,t),n=e.node;if(!e.visible)return [0,0];let a=.5;if(n.kind==='group'){a=0;for(const c of n.children){const b=sample(c,e.progress)[1];a=b+a*(1-b);}}return [.5,a*n.opacity];}
 const [color,a]=sample(p.root,time),rgba=[color,color,color,a];if(!p.output.alpha){for(let k=0;k<3;k++)rgba[k]=color*a+parseInt(p.output.background.slice(1+k*2,3+k*2),16)/255*(1-a);rgba[3]=1;}
 const pix=new Float32Array(w*h*4);for(let i=0;i<pix.length;i+=4)pix.set(rgba,i);return pix;
};

test('PSD round trip preserves Unicode layer order, groups, background and pixel data',async()=>{
 const p=project(),g=node('group');g.name='组合甲';g.children=[node(),node('shape','FBM')];p.root.children=[g,node()];p.output.alpha=false;p.output.background='#2468ac';
 const before=JSON.stringify(p),result=await exportPSD(p,{render:fake,width:3,height:2});
 const psd=read(result.bytes);assert.equal(psd.width,3);assert.equal(psd.height,2);
 assert.deepEqual(psd.children.map(x=>x.name),['画布背景','组合甲','圆形']);assert.deepEqual(psd.children[1].children.map(x=>x.name),['圆形','分形噪声']);
 assert.deepEqual([...psd.children[0].imageData.data.slice(0,4)],[36,104,172,255]);assert.equal(psd.children[1].children[0].imageData.data[3],128);
 assert.equal(JSON.stringify(p),before);assert.equal(result.stats.pixels,3);
});

test('PSD writes editable fill and four-knot paths, with ring subtraction and unbaked opacity',async()=>{
 const p=project(),n=solid('Ring');n.opacity=.4;n.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,.2],[1,.6]]};p.root.children=[n];
 const seen=[],result=await exportPSD(p,{time:.5,width:20,height:10,render:(p,w,h,t)=>{seen.push(p.root.children[0]);return fake(p,w,h,t);}}),l=read(result.bytes).children[0];
 assert.equal(result.stats.vectors,1);assert.equal(l.vectorFill.type,'color');assert.deepEqual(l.vectorFill.color,{r:18,g:52,b:171});
 assert.equal(l.vectorMask.paths.length,2);assert.equal(l.vectorMask.paths[1].operation,'subtract');assert.equal(l.vectorMask.paths[0].knots.length,4);assert.ok(Math.abs(l.opacity-.4)<.005);
 assert.equal(seen[0].opacity,.4);assert.equal(seen[1].opacity,1);assert.equal(seen[1].tracks.opacity,undefined);
});

test('vector outline coordinates follow contain, pivot, physical rotation and document y inversion',()=>{
 const n=solid('Circle');n.params[0]=.5;n.transform={...n.transform,x:.3,y:.7,width:.4,height:.8,rotation:90,fit:'contain'};
 const v=shapeVector(n,200,100),a=v.vectorMask.paths[0].knots[0].points;
 assert.ok(Math.abs(a[2]-60)<1e-8);assert.ok(Math.abs(a[3]-10)<1e-8);
 n.transform.mirrorX=true;const b=shapeVector(n,200,100).vectorMask.paths[0].knots[0].points;assert.ok(Math.abs(b[3]-50)<1e-8);
});

test('cross-sibling inverse mask collapses preceding prefix, later over nodes remain layers',()=>{
 const p=project(),a=node(),mask=node(),b=node();mask.blend='inverseMask';p.root.children=[a,mask,b];
 const plan=planPSD(p);assert.equal(plan.stats.merged,1);assert.equal(plan.tree.children.length,2);assert.deepEqual(plan.tree.children[0].root.children.map(x=>x.id),[a.id,mask.id]);assert.equal(plan.tree.children[1].root.children[0].id,b.id);
});

test('group effects flatten minimal subtree; feather, UV, gradient and local clipping disallow vector',()=>{
 const p=project(),g=node('group');g.opacity=.5;g.children=[solid('Circle')];p.root.children=[g,node()];
 const plan=planPSD(p);assert.equal(plan.stats.merged,1);assert.equal(plan.tree.children.length,2);assert.match(plan.tree.children[0].name,/合成/);
 for(const change of [n=>n.params[3]=.1,n=>n.uv[2]=.2,n=>n.color.fill='gradient',n=>n.params[0]=1.1,n=>n.mask=node()]){const n=solid('Circle');change(n);assert.equal(shapeVector(n,10,10),null);}
});

test('export obeys current frame visibility and data output stays merged',()=>{
 const p=project(),n=p.root.children[0];n.timing={...n.timing,start:.3,end:.8,outside:'hide'};assert.equal(planPSD(p,{time:0}).stats.pixels,0);assert.equal(planPSD(p,{time:.5}).stats.pixels,1);
 p.output.mode='normal';assert.equal(planPSD(p).stats.merged,1);
});

test('HDR addition includes later attenuation; mismatched cached layers fall back to full composite',async()=>{
 const p=project(),a=node(),b=node(),c=node();b.blend='add';p.root.children=[a,b,c];assert.equal(planPSD(p).tree.children.length,1);assert.equal(planPSD(p).tree.children[0].root.children.length,3);
 let calls=0;const result=await exportPSD(project(),{width:1,height:1,render:()=>{calls++;return Float32Array.from(calls===1?[1,0,0,1]:[0,1,0,1]);}});
 assert.equal(result.stats.merged,1);assert.match(result.warnings.at(-1),/拆层/);assert.deepEqual([...read(result.bytes).children[0].imageData.data],[255,0,0,255]);
});

test('PSD cancellation and allocation guards reject before costly work; malformed pixels fail',async()=>{
 const p=project();p.root.children=Array.from({length:64},()=>node());assert.throws(()=>planPSD(p,{width:1024,height:1024}),/总像素预算/);assert.throws(()=>planPSD(p,{width:0}),/尺寸/);
 let renders=0;await assert.rejects(exportPSD(project(),{render:()=>{renders++;},check:()=>{throw Error('取消');}}),/取消/);assert.equal(renders,0);
 let stop=false;await assert.rejects(exportPSD(project(),{width:1,height:1,render:fake,pause:()=>{stop=true;},check:()=>{if(stop)throw Error('取消');}}),/取消/);
 assert.throws(()=>pixelData([],2,2),/尺寸/);
});

test('contour effects rasterize the affected subtree instead of exporting an incorrect vector',()=>{
 const p=project(),n=solid('Circle');n.contour={mode:'outline',radius:.02};p.root.children=[n];assert.equal(shapeVector(n,128,128),null);
 const g=node('group');g.children=[n];g.contour={mode:'erode',radius:.02};p.root.children=[g];const plan=planPSD(p);assert.equal(plan.stats.merged,1);assert.equal(plan.stats.vectors,0);
});
