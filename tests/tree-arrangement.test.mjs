import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeTreeArrangement,advancedRecords,modifyRecords,matchedTiles} from '../web/tree-arrangement.js';
import {sanitizeArrangement} from '../web/arrangement.js';
import {node,project,sanitizeTree,evaluateNode,instanceChildren,expandInstances,placements} from '../web/tree-model.js';
import {selectionRegions} from '../web/tree-view.js';

test('tree arrangements preserve the scalar ABI and roundtrip typed extra animation',()=>{
 const p=project(),n=p.root.children[0];n.arrange[0]=15;n.arrange[1]=8;n.arrangeExtra.weave='basket';n.arrangeExtra.flow='wave';n.tileEdges=7;
 n.tracks['arrangeExtra.flowPhase']={mode:'absolute',ease:'linear',keys:[[0,0],[1,360]]};
 const copy=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0];
 assert.equal(copy.arrange[0],15);assert.equal(copy.arrange[1],4);assert.equal(copy.arrange.length,59);
 assert.equal(copy.arrangeExtra.weave,'basket');assert.equal(copy.tileEdges,7);assert.equal(evaluateNode(copy,.5).node.arrangeExtra.flowPhase,180);
 assert.equal(sanitizeArrangement(n.arrange)[0],12);assert.equal(sanitizeTreeArrangement([16])[0],16);
});

test('rectangular borders use physical perimeter and a closed uniform phase',()=>{
 const n=node();n.arrange[0]=13;n.arrange[3]=12;n.arrange[19]=2;Object.assign(n.arrangeExtra,{width:.8,height:.4,corner:0});
 const a=advancedRecords(n,2);assert.equal(a.length,12);assert.equal(new Set(a.map(r=>[r.x,r.y].join(','))).size,12);
 for(const p of a)assert.ok(Math.abs(Math.abs(p.x-.5)-.4)<1e-8||Math.abs(Math.abs(p.y-.5)-.2)<1e-8);
 n.arrangeExtra.offset=1/12;const shifted=advancedRecords(n,2);assert.ok(Math.hypot((shifted[0].x-a[1].x)*2,shifted[0].y-a[1].y)<1e-8);
 n.arrangeExtra.corner=.1;assert.ok(advancedRecords(n,2).every(p=>Number.isFinite(p.turn)));
});

test('herringbone and basket cover a periodic lattice exactly at all canvas aspects',()=>{
 for(const weave of ['herringbone','basket'])for(const aspect of [.5,1,2]){
  const n=node();n.arrange[0]=15;n.arrange[1]=2;n.arrange[2]=3;n.arrangeExtra.weave=weave;
  const cols=8,rows=12,records=advancedRecords(n,aspect);assert.equal(records.length,cols*rows/2);
  const coverage=new Array(cols*rows).fill(0);
  for(const r of records){const vertical=r.turn!==0,w=vertical?r.height/aspect:r.width,h=vertical?r.width*aspect:r.height;
   assert.ok(Math.abs(w*cols-(vertical?1:2))<1e-8);assert.ok(Math.abs(h*rows-(vertical?2:1))<1e-8);
   const x0=Math.round((r.x-w/2)*cols),y0=Math.round((r.y-h/2)*rows);
   for(let y=0;y<Math.round(h*rows);y++)for(let x=0;x<Math.round(w*cols);x++)coverage[((y0+y+rows)%rows)*cols+(x0+x+cols)%cols]++;
  }assert.ok(coverage.every(v=>v===1),weave+' must have no gaps or overlaps');
 }
});

test('outline spacing includes multiple closed loops and preserves opposite hole offsets',()=>{
 const n=node('group');n.arrange[0]=14;n.arrange[3]=48;
 const loops=[[[0,0],[1,0],[1,1],[0,1]],[[.25,.25],[.25,.75],[.75,.75],[.75,.25]]];
 const records=advancedRecords(n,1,loops);assert.equal(records.length,48);
 assert.equal(records.filter(p=>p.x>.1&&p.x<.9&&p.y>.1&&p.y<.9).length,16);
 n.arrangeExtra.contourOffset=.05;const shifted=advancedRecords(n,1,loops);assert.ok(Math.abs(shifted[0].y+.05)<1e-8);assert.ok(Math.abs(shifted[32].x-.3)<1e-8);
 n.arrange[30]=1;n.arrange[31]=.1;assert.equal(advancedRecords(n,1,loops).length,60);
});

function tiles(wrap,cols=6,rows=5){const n=node('group');n.arrange[0]=16;n.arrange[1]=cols;n.arrange[2]=rows;n.arrange[11]=17;n.seamless=wrap;n.children=Array.from({length:16},(_,mask)=>Object.assign(node(),{tileEdges:mask}));return n;}
test('rule tiles match all interior and periodic edge ports and select the chosen child',()=>{
 for(const wrap of [false,true])for(const [cols,rows]of [[6,5],[1,1],[1,4],[4,1]]){
  const n=tiles(wrap,cols,rows),records=matchedTiles(n),m=records.map((r,i)=>{assert.equal(instanceChildren(n,i,r)[0],n.children[r.childIndex]);return n.children[r.childIndex].tileEdges;});
  assert.deepEqual(matchedTiles(n),records);assert.equal(records.length,cols*rows);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=m[y*cols+x];
   if(x<cols-1||wrap)assert.equal(!!(a&1),!!(m[y*cols+(x+1)%cols]&4));else assert.equal(a&1,0);
   if(y<rows-1||wrap)assert.equal(!!(a&2),!!(m[((y+1)%rows)*cols+x]&8));else assert.equal(a&2,0);
   if(!wrap&&x===0)assert.equal(a&4,0);if(!wrap&&y===0)assert.equal(a&8,0);
  }
 }
 const n=tiles(false);n.children=[Object.assign(node(),{tileEdges:1})];assert.throws(()=>matchedTiles(n),/无法拼接/);
});

test('selection regions follow the chosen tile and show a contour source only once',()=>{
 const p=project(),n=tiles(true);p.root.children=[n];const records=matchedTiles(n);
 for(let i=0;i<n.children.length;i++)assert.equal(selectionRegions(p,n.children[i].id,0).regions.length,records.filter(r=>r.childIndex===i).length);
 n.arrange[0]=14;n.children=n.children.slice(0,2);n.arrangeExtra.showSource=false;
 const getRecords=(a,...args)=>a[0]===14?[{x:.25,y:.5,width:.1,height:.1,turn:0},{x:.75,y:.5,width:.1,height:.1,turn:0}]:placements(a,...args);
 assert.equal(selectionRegions(p,n.children[0].id,0,{records:getRecords}).regions.length,0);
 n.arrangeExtra.showSource=true;assert.equal(selectionRegions(p,n.children[0].id,0,{records:getRecords}).regions.length,1);assert.equal(selectionRegions(p,n.children[1].id,0,{records:getRecords}).regions.length,2);
});

test('gradients and flow change geometry and opacity without violating scatter avoidance',()=>{
 const n=node();n.arrange[0]=1;Object.assign(n.arrangeExtra,{gradient:'x',scaleFrom:.2,scaleTo:1.2,opacityFrom:0,opacityTo:1,rotationTo:90});
 const input=[{x:0,y:.5,width:.1,height:.1,turn:0},{x:1,y:.5,width:.1,height:.1,turn:0}],out=modifyRecords(input,n);
 assert.equal(out[0].opacity,0);assert.equal(out[1].opacity,1);assert.equal(out[1].width,.12);assert.equal(out[1].turn,Math.PI/2);
 Object.assign(n.arrangeExtra,{gradient:'none',flow:'wave',flowAmount:.1,flowFrequency:1});assert.ok(Math.abs(modifyRecords([{...input[0],x:.25}],n)[0].y-.6)<1e-8);
 n.arrangeExtra.flow='vortex';assert.notEqual(modifyRecords([{...input[0],x:.7}],n)[0].y,.5);
 n.scatterAvoidOverlap=true;n.arrange[0]=7;assert.equal(modifyRecords(input,n),input);n.arrange[0]=16;assert.equal(modifyRecords(input,n),input);
});

test('expansion bakes per-instance opacity once and keeps contour source once',()=>{
 const p=project(),n=node('group');p.root.children=[n];n.arrange[0]=14;n.arrangeExtra.showSource=true;n.children=[node(),node()];
 const source=n.children[0].id;expandInstances(p.root,n.id,0,[{x:.25,y:.5,width:.1,height:.1,turn:0,opacity:.3},{x:.75,y:.5,width:.1,height:.1,turn:0,opacity:.8}]);
 const expanded=p.root.children[0];assert.equal(expanded.children.length,3);assert.notEqual(expanded.children[0].id,source);
 assert.deepEqual(expanded.children.slice(1).map(c=>c.opacity),[.3,.8]);assert.ok(expanded.children.slice(1).every(c=>c.arrangeExtra.gradient==='none'&&c.children.length===1));assert.doesNotThrow(()=>sanitizeTree(p));
});
