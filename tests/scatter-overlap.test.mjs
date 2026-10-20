import test from 'node:test';import assert from 'node:assert/strict';
import {generateArrangement} from '../web/arrangement-layouts.js';
import {node,project,sanitizeTree,placements,expandInstances} from '../web/tree-model.js';
import {selectionRegions} from '../web/tree-view.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';

function separated(points,gap,wrap=false){for(let i=0;i<points.length;i++)for(let j=0;j<i;j++){let dx=points[i].x-points[j].x,dy=points[i].y-points[j].y;if(wrap){dx-=Math.round(dx);dy-=Math.round(dy);}assert.ok(Math.hypot(dx,dy)+1e-10>=(Math.min(1,points[i].size)+Math.min(1,points[j].size))/Math.SQRT2+gap);}}
test('overlap prevention respects variable size, spin, seeds, density and periodic neighbors',()=>{
 for(const mode of [7,12])for(const wrap of [false,true])for(const seed of [1,7,999]){const a=node().arrange;a[0]=mode;a[3]=100;a[4]=.09;a[9]=.5;a[10]=180;a[18]=1.6;a[6]=67;a[11]=seed;
  const opts={avoidOverlap:true,gap:.01,wrap,density:(x,y)=>x>-.2?1:0},points=generateArrangement(a,opts);assert.ok(points.length>1);assert.ok(points.length<100);assert.deepEqual(points,generateArrangement(a,opts));separated(points,.01,wrap);
 }
});
test('disabled prevention preserves scatter output and saturated regions stay bounded',()=>{
 const a=node().arrange;a[0]=7;a[3]=50;a[4]=.12;assert.deepEqual(generateArrangement(a),generateArrangement(a,{avoidOverlap:false,gap:.5,wrap:true}));
 a[4]=2;a[3]=256;const p=generateArrangement(a,{avoidOverlap:true});assert.equal(p.length,1);assert.equal(generateArrangement(a,{avoidOverlap:true,wrap:true}).length,0);
 const empty=generateArrangement({...a,0:12},{avoidOverlap:true,density:()=>0});assert.equal(empty.length,0);
});
test('node persistence, guides and expansion share overlap-safe placements',async()=>{
 const p=project(),g=node('group'),c=node();g.children=[c];p.root.children=[g];g.arrange[0]=7;g.arrange[3]=50;g.arrange[4]=.12;g.scatterAvoidOverlap=true;g.scatterGap=.02;
 const points=placements(g.arrange,g);assert.ok(points.length<50);assert.equal(selectionRegions(p,c.id,0).regions.length,points.length);
 const pack=await readResourcePack(await encodeResourcePack(p));const clean=sanitizeTree(pack.payload);assert.equal(clean.root.children[0].scatterAvoidOverlap,true);assert.equal(clean.root.children[0].scatterGap,.02);
 assert.deepEqual(placements(clean.root.children[0].arrange,clean.root.children[0]),points);expandInstances(p.root,g.id,0);assert.equal(p.root.children[0].children.length,points.length);
 delete clean.root.children[0].scatterAvoidOverlap;delete clean.root.children[0].scatterGap;assert.equal(sanitizeTree(clean).root.children[0].scatterAvoidOverlap,false);assert.equal(sanitizeTree(clean).root.children[0].scatterGap,0);
});
