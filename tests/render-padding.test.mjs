import test from 'node:test';
import assert from 'node:assert/strict';
import {paddedPlacement,paddedRecords,arrangedPadding} from '../web/render-padding.js';
import {node,placements,animationType,sanitizeTree,project} from '../web/tree-model.js';
import {BY_ID} from '../web/catalog.js';
import {treeSamples} from '../web/tree-samples.js';
test('render margins preserve logical pivots under rotation and mirroring',()=>{
 const box=[.37,.61,.3,.5],axis=[.2,.8,.73,-1],sp=.46,tp=.17,p=paddedPlacement(box,axis,sp,tp);
 for(const u of [-.3,0,.5,1,1.3])for(const v of [-.3,0,.5,1,1.3]){
  const map=(b,a,x,y)=>{const dx=(x-a[0])*b[2]*a[3],dy=(y-a[1])*b[3],c=Math.cos(a[2]),s=Math.sin(a[2]);return [b[0]+c*dx-s*dy,b[1]+s*dx+c*dy];};
  const expected=map(box,axis,u,v),actual=map(p.box,p.axis,(u+sp)/(1+2*sp),(v+sp)/(1+2*sp)).map(x=>x*(1+2*tp)-tp);
  expected.forEach((x,i)=>assert.ok(Math.abs(x-actual[i])<1e-12));
 }
 assert.deepEqual(paddedPlacement(box,axis),{box,axis});
});
test('puzzle grid pitch is independent of tab radius and render margins',()=>{
 const n=node('shape','PuzzlePiece');n.arrange[0]=1;n.arrange[1]=n.arrange[2]=4;
 const before=placements(n.arrange,n);n.params[4]=.2;const after=placements(n.arrange,n);assert.deepEqual(after,before);assert.equal(before.length,16);
 const records=paddedRecords(before,.46);assert.ok(Math.abs(records[1].x-records[0].x-(before[1].x-before[0].x))<1e-12);assert.equal(records[0].width,before[0].width*1.92);
 assert.equal(arrangedPadding(.46,before),.46*.25);
});
test('puzzle exposes one cell and discrete edge controls, with enough space for maximum tabs',()=>{
 const d=BY_ID.get('PuzzlePiece'),n=node('shape','PuzzlePiece');assert.equal(d.parameters.length,15);
 for(let i=0;i<4;i++){assert.deepEqual(d.parameters[i].options.map(x=>x.value),[-1,0,1]);assert.equal(animationType(n,'params.'+i),'discrete');}
 assert.equal(animationType(n,'params.9'),'discrete');assert.deepEqual(d.parameters.find(p=>p.slot===9).options.map(o=>o.value),[0,1,2,3]);
 for(let i=11;i<=14;i++){const spec=d.parameters.find(p=>p.slot===i);assert.equal(spec.min,0);assert.equal(spec.default,0);assert.equal(spec.max,.4);}
 assert.ok(d.definition.renderPadding>.2*(1+.92)+.025+.02);
 const p=project();p.root.children=[n];assert.deepEqual(sanitizeTree(p).root.children[0].params,n.params);
 const samples=treeSamples(),grid=samples.find(s=>s.name==='单块拼图网格'),board=samples.find(s=>s.name==='彩色拼图板');assert.equal(grid.root.children.length,0);assert.equal(board.root.children.length,9);
});
