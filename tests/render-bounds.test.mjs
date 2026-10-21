import test from 'node:test';
import assert from 'node:assert/strict';
import {UNIT_BOUNDS,boundedPlacement,transformBounds,boundsSize,effectMargins,periodicCopies} from '../web/render-bounds.js';
import {node,placements,animationType,sanitizeTree,project,evaluateNode,expandInstances} from '../web/tree-model.js';
import {BY_ID} from '../web/catalog.js';
import {treeSamples} from '../web/tree-samples.js';
test('directional render margins preserve logical pivots and mirroring',()=>{
 const box=[.37,.61,.3,.5],axis=[.2,.8,0,-1],sp=[-.46,-.12,1.3,1.22],tp=[-.1,-.2,1.4,1.8],p=boundedPlacement(box,axis,sp,tp);
 for(const u of [-.3,0,.5,1,1.3])for(const v of [-.3,0,.5,1,1.3]){
  const map=(b,a,x,y)=>{const dx=(x-a[0])*b[2]*a[3],dy=(y-a[1])*b[3],c=Math.cos(a[2]),s=Math.sin(a[2]);return [b[0]+c*dx-s*dy,b[1]+s*dx+c*dy];};
  const expected=map(box,axis,u,v),actual=map(p.box,p.axis,(u-sp[0])/boundsSize(sp)[0],(v-sp[1])/boundsSize(sp)[1]).map((x,i)=>x*boundsSize(tp)[i]+tp[i]);
  expected.forEach((x,i)=>assert.ok(Math.abs(x-actual[i])<1e-12));
 }
 assert.deepEqual(boundedPlacement(box,axis),{box,axis});
});
test('puzzle grid pitch is independent of tab radius and render margins',()=>{
 const n=node('shape','PuzzlePiece');n.arrange[0]=1;n.arrange[1]=n.arrange[2]=4;
 const before=placements(n.arrange,n);n.params[4]=.2;const after=placements(n.arrange,n);assert.deepEqual(after,before);assert.equal(before.length,16);
 assert.equal(n.boundary,'visible');const r=before[0],p=boundedPlacement([r.x,r.y,r.width,r.height],[.5,.5,0,1],[-.46,-.46,1.46,1.46]);assert.equal(p.box[2],r.width*1.92);assert.equal(p.box[0],r.x);
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

test('asymmetric render bounds preserve rotated physical placement and invert demand',()=>{
 const source=[-.8,-.2,1.1,1.4],target=[-.1,0,1.8,1.2],box=[.3,.6,.4,.23],axis=[.1,.85,.74,-1],aspect=1.7,p=boundedPlacement(box,axis,source,target);
 const point=[-.5,1.1,-.5,1.1],expected=transformBounds(point,box,axis,aspect),uv=[(point[0]-source[0])/boundsSize(source)[0],(point[1]-source[1])/boundsSize(source)[1]],actual=transformBounds([...uv,...uv],p.box,p.axis,aspect*boundsSize(target)[0]/boundsSize(target)[1]).map((x,i)=>x*boundsSize(target)[i%2]+target[i%2]);
 actual.forEach((x,i)=>assert.ok(Math.abs(x-expected[i])<1e-12));
 const back=transformBounds(expected,box,axis,aspect,true);back.forEach((x,i)=>assert.ok(Math.abs(x-point[i])<1e-12));
 assert.deepEqual(effectMargins({postFx:[16,1,32,0,0,0,0],contour:{mode:'dilate',radius:.03125}},2),[.0625,.125]);
});
test('overflow is shared, discrete, saved and clamped only at the canvas root',()=>{
 const p=project(),g=node('group'),leaf=node('shape','Circle');assert.equal(g.boundary,'clip');assert.equal(leaf.boundary,'clip');g.boundary=leaf.boundary='visible';g.children=[leaf];p.root.boundary='visible';p.root.children=[g];
 const saved=sanitizeTree(JSON.parse(JSON.stringify(p)));assert.equal(saved.root.boundary,'clip');assert.equal(saved.root.children[0].boundary,'visible');assert.equal(saved.root.children[0].children[0].boundary,'visible');assert.equal(animationType(g,'boundary'),'discrete');
});

test('boundary mode is the only saved selector, with discrete animation and expansion semantics',()=>{
 const p=project(),n=node('group');p.root.children=[n];n.boundary='repeat';n.tracks.boundary={mode:'absolute',ease:'linear',keys:[[0,'clip'],[.5,'visible'],[.8,'repeat']]};n.children=[node()];n.arrange[0]=1;n.arrange[1]=n.arrange[2]=2;
 for(const [t,mode]of [[.25,'clip'],[.6,'visible'],[.9,'repeat']])assert.equal(evaluateNode(n,t).node.boundary,mode);
 const saved=sanitizeTree(JSON.parse(JSON.stringify(p)));assert.equal(saved.root.children[0].boundary,'repeat');assert.equal('seamless' in saved.root.children[0],false);assert.equal('overflow' in saved.root.children[0],false);assert.deepEqual(saved.root.children[0].tracks.boundary.keys,n.tracks.boundary.keys);assert.equal(saved.root.children[0].tracks.boundary.ease,'hold');assert.equal(saved.root.children[0].tracks.boundary.type,'discrete');
 expandInstances(p.root,n.id,0);const expanded=p.root.children[0];assert.equal(expanded.boundary,'repeat');assert.equal(expanded.children[0].boundary,'visible');assert.equal(evaluateNode(expanded.children[0],.9).node.boundary,'visible');
});
test('periodic copies include both neighbors and corner overflow, with bounded allocation',()=>{
 const box=[.95,.95,.4,.4],axis=[.5,.5,0,1],copies=periodicCopies(box,axis,UNIT_BOUNDS);assert.equal(copies.length,4);
 assert.ok(copies.some(b=>b[0]<0&&b[1]<0));assert.ok(copies.some(b=>b[0]===.95&&b[1]===.95));
 assert.equal(periodicCopies([.5,.5,1,1],axis,UNIT_BOUNDS).length,1);
 assert.equal(periodicCopies([.5,.5,1,1],axis,[-.2,-.2,1.2,1.2]).length,9);
 assert.throws(()=>periodicCopies([.5,.5,100,100],axis,UNIT_BOUNDS,1,100),/预算/);
});
