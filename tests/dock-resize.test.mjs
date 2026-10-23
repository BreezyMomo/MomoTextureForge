import test from 'node:test';
import assert from 'node:assert/strict';
import {createSplitResize} from '../web/dock-resize.js';
import {layoutPreset,sanitizeLayout,findLayoutNode} from '../web/dock-layout.js';

const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-7,`${message}: ${a} vs ${b}`);
function geometry(root,size,axis=root.axis){
 const leaves=new Map(),dividers=new Map();
 function walk(n,start,end){
  if(n.kind==='stack'){leaves.set(n.id,{start,end});return;}
  if(n.axis!==axis){walk(n.first,start,end);walk(n.second,start,end);return;}
  const center=start+(end-start)*n.ratio;dividers.set(n.id,center);
  walk(n.first,start,center-3);walk(n.second,center+3,end);
 }
 walk(root,0,size);return {leaves,dividers};
}
function assertLocal(before,after,selected,delta){
 for(const [id,center]of before.dividers)near(after.dividers.get(id),center+(id===selected?delta:0),'unrelated divider stays fixed');
 const center=before.dividers.get(selected);
 for(const [id,rect]of before.leaves){
  near(after.leaves.get(id).start,rect.start+(Math.abs(rect.start-center-3)<1e-7?delta:0),'only touching start edge moves');
  near(after.leaves.get(id).end,rect.end+(Math.abs(rect.end-center+3)<1e-7?delta:0),'only touching end edge moves');
 }
}

for(const axis of ['x','y'])test(`${axis}: resizing each nested divider changes only adjacent leaves`,()=>{
 const layout=layoutPreset();
 function orient(n){if(n.kind==='split'){n.axis=axis;orient(n.first);orient(n.second);}}orient(layout.root);
 const initial=geometry(layout.root,1800);
 for(const id of initial.dividers.keys())for(const requested of [-60,60,-10000,10000]){
  const copy=structuredClone(layout),selected=findLayoutNode(copy,id),bounds=geometry(copy.root,1800);
  // The selected subtree has a different origin, but delta stays in pixels.
  function sizeOf(n,size){if(n===selected)return size;if(n.kind!=='split')return;return sizeOf(n.first,size*n.ratio-3)??sizeOf(n.second,size*(1-n.ratio)-3);}
  const resize=createSplitResize(selected,sizeOf(copy.root,1800)),delta=resize.resize(requested);
  assertLocal(bounds,geometry(copy.root,1800),id,delta);
  for(const rect of geometry(copy.root,1800).leaves.values())assert.ok(rect.end-rect.start>=(axis==='x'?96:72)-1e-7);
  assert.deepEqual(sanitizeLayout(copy),copy,'all resized ratios survive persistence');
  resize.restore();assert.deepEqual(copy,layout,'cancel restores every compensated ratio');
 }
});

test('perpendicular branches share the moving edge while their ratios stay unchanged',()=>{
 const layout=layoutPreset('animation'),before=geometry(layout.root,1800,'x'),snapshot=structuredClone(layout);
 const resize=createSplitResize(layout.root,1800),delta=resize.resize(90);
 assertLocal(before,geometry(layout.root,1800,'x'),layout.root.id,delta);
 near(layout.root.first.ratio,snapshot.root.first.ratio,'left vertical split unchanged');
 near(layout.root.second.first.ratio,snapshot.root.second.first.ratio,'center vertical split unchanged');
});

test('small existing panels do not jump, and repeated moves use the initial snapshot',()=>{
 const layout=layoutPreset(),before=structuredClone(layout),resize=createSplitResize(layout.root,500);
 resize.resize(0);assert.deepEqual(layout,before);
 near(resize.resize(-10000),0,'undersized left adjacent pane cannot shrink');
 resize.resize(80);const once=structuredClone(layout);resize.resize(80);assert.deepEqual(layout,once);
 resize.resize(0);assert.deepEqual(layout,before);resize.restore();assert.deepEqual(layout,before);
});

test('narrow edge panels below the old 12% limit round trip without moving dividers',()=>{
 const layout=layoutPreset(),resize=createSplitResize(layout.root.second,4000);resize.resize(resize.maxDelta);
 assert.ok(layout.root.second.ratio>.88);assert.deepEqual(sanitizeLayout(layout),layout);
});
