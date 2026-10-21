import test from 'node:test';
import assert from 'node:assert/strict';
import {project,node,pathGet,pathSet,find} from '../web/tree-model.js';
import {selectionRegions} from '../web/tree-view.js';
import {bounds} from '../web/canvas-transform.js';
import {commonValue,batchValues,validateSelectionValues,layoutSelection,selectionCompatibility,shapeParameterVisible} from '../web/selection-editing.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const region=(p,n)=>selectionRegions(p,n.id,0).regions[0];
const items=(p,ns)=>ns.map(n=>({id:n.id,region:region(p,n)}));
const apply=(p,changes)=>{for(const c of changes)for(const [k,v]of Object.entries(c.values))pathSet(find(p.root,c.id).node,k,v);};
test('shared tabs gate shape fields and group-only controls by every effective target',()=>{
 const a=node('shape','Ring'),b=node('shape','Ring'),c=node('shape','Circle'),g=node('group');
 assert.equal(selectionCompatibility([a,b]).sameShape,true);assert.equal(selectionCompatibility([a,c]).allShapes,true);assert.equal(selectionCompatibility([a,c]).sameShape,false);assert.equal(selectionCompatibility([g,a]).allGroups,false);assert.equal(selectionCompatibility([g,node('group')]).allGroups,true);
 assert.equal(selectionCompatibility([node('shape','TurbulentFlame'),node('shape','Bonfire')]).usesTime,true);assert.equal(selectionCompatibility([a,node('shape','Bonfire')]).usesTime,false);
 const star=node('shape','Star');star.params[5]=0;assert.equal(shapeParameterVisible(star,{slot:1}),false);star.params[5]=1;assert.equal(shapeParameterVisible(star,{slot:1}),true);
 const gear=node('shape','Gear');gear.params[8]=1;assert.equal(shapeParameterVisible(gear,{slot:5}),false);assert.equal(shapeParameterVisible(gear,{slot:9}),true);
});
function fixture(){const p=project();p.root.children=[.15,.4,.85].map((x,i)=>{const n=node();Object.assign(n.transform,{x,y:.25+i*.2,width:.1+i*.05,height:.1});return n;});return p;}
test('mixed values are not coerced, and batch sizing preserves each locked aspect',()=>{
 assert.equal(commonValue([.2,.4]),undefined);assert.equal(commonValue([.2,.2]),.2);assert.equal(commonValue([]),undefined);
 const n=node();Object.assign(n.transform,{width:.2,height:.4,lockAspect:true});assert.deepEqual(batchValues(n,'transform.width',.3,pathGet),{'transform.width':.3,'transform.height':.6});
 assert.throws(()=>validateSelectionValues([{values:batchValues(n,'transform.width',.8,pathGet)}]),/范围/);assert.equal(n.transform.width,.2);
 n.transform.lockAspect=false;assert.deepEqual(batchValues(n,'transform.width',.3,pathGet),{'transform.width':.3});
});
test('alignments use outer bounds and canvas reference; equal gaps keep both endpoints',()=>{
 const p=fixture(),ns=p.root.children;apply(p,layoutSelection(items(p,ns),'top'));const bs=ns.map(n=>bounds([region(p,n)]));bs.forEach(b=>near(b.max[1],bs[0].max[1]));
 apply(p,layoutSelection(items(p,ns),'centerX','canvas'));ns.forEach(n=>near(region(p,n).center[0],.5));
 const q=fixture(),qs=q.root.children,ends=[structuredClone(qs[0].transform),structuredClone(qs[2].transform)];apply(q,layoutSelection(items(q,qs),'distributeX'));const boxes=qs.map(n=>bounds([region(q,n)]));near(boxes[1].min[0]-boxes[0].max[0],boxes[2].min[0]-boxes[1].max[0]);assert.deepEqual(qs[0].transform,ends[0]);assert.deepEqual(qs[2].transform,ends[1]);
 apply(q,layoutSelection(items(q,qs),'distributeY'));const ys=qs.map(n=>bounds([region(q,n)]));near(ys[1].min[1]-ys[0].max[1],ys[2].min[1]-ys[1].max[1]);
});
test('world alignment accounts for rotated mirrored parents and noncentral pivots',()=>{
 for(const ratio of [.6,1.8]){const p=project(),g=node('group'),a=node(),b=node();p.canvas.ratio=ratio;p.root.children=[g,b];g.children=[a];Object.assign(g.transform,{width:.7,height:.8,rotation:35,mirrorX:true});Object.assign(a.transform,{width:.2,height:.3,rotation:22,pivotX:.1,pivotY:.8});Object.assign(b.transform,{width:.12,height:.16,x:.7,y:.3});
  apply(p,layoutSelection(items(p,[a,b]),'left'));near(bounds([region(p,a)]).min[0],bounds([region(p,b)]).min[0]);
  apply(p,layoutSelection(items(p,[a,b]),'centerY','canvas'));for(const n of [a,b]){const box=bounds([region(p,n)]);near((box.min[1]+box.max[1])/2,.5);}
 }
});
test('ambiguous instances, invalid limits, and insufficient selection fail before mutation',()=>{
 const p=fixture(),ns=p.root.children;assert.throws(()=>layoutSelection(items(p,ns.slice(0,2)),'distributeX'),/三个/);assert.throws(()=>layoutSelection([{id:ns[0].id,region:null},items(p,ns)[1]],'left'),/副本/);assert.throws(()=>layoutSelection(items(p,ns).slice(0,1),'left'),/两个/);
 ns[0].transform.x=-1.9;ns[0].transform.width=1;ns[1].transform.x=1.9;const before=JSON.stringify(p);assert.throws(()=>layoutSelection(items(p,ns),'left'),/范围/);assert.equal(JSON.stringify(p),before);
});
