import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BY_ID,CATALOG} from '../web/catalog.js';
import {project,node,sanitizeTree,evaluateNode,expandInstances,animationType,canvasRoot} from '../web/tree-model.js';
import {contourPasses} from '../web/contour.js';
import {libraryVisible,libraryAliases} from '../web/library-policy.js';
const plan=JSON.parse(await readFile(new URL('../web/definitions/library-curation.json',import.meta.url)));
test('curated catalog removes only approved redundant entries and keeps legacy iris',async()=>{
 assert.equal(CATALOG.length,301);assert.ok(CATALOG.every(p=>libraryVisible(p.id)));
 for(const id of plan.removed)assert.ok(!BY_ID.has(id),id);
 for(const id of plan.added)assert.ok(BY_ID.has(id),id);
 assert.equal(BY_ID.get('IrisBlades').zh,'光阑叶片');
 assert.match(await readFile(new URL('../web/definitions/patterns/IrisBlades/formula.glsl',import.meta.url),'utf8'),/poly\(q,N,R\)-W\*cos/);
 assert.ok(libraryAliases('Dots').includes('交错'));
});
test('curated active parameters round trip and modes use discrete keyframes',()=>{
 for(const id of plan.changed){const p=project();p.root.children=[node('shape',id)];const n=p.root.children[0];for(const spec of BY_ID.get(id).parameters)n.params[spec.slot]=spec.max;assert.deepEqual(sanitizeTree(p).root.children[0].params,n.params,id);}
 for(const [id,slot]of [['Gear',8],['Halftone',4],['RingPulse',4],['LineSegment',5]])assert.equal(animationType(node('shape',id),'params.'+slot),'discrete');
});
test('contour effects roundtrip, animate without source mutation and expand once',()=>{
 const p=project(),n=p.root.children[0];n.contour={mode:'outline',radius:.02};n.tracks['contour.radius']={keys:[[0,.01],[1,.05]],ease:'linear'};
 n.tracks['contour.mode']={keys:[[0,'outline'],[1,'erode']],ease:'hold'};
 const clean=sanitizeTree(JSON.parse(JSON.stringify(p))),e=evaluateNode(clean.root.children[0],.5).node;
 assert.ok(Math.abs(e.contour.radius-.03)<1e-9);assert.equal(n.contour.radius,.02);assert.equal(e.contour.mode,'outline');
 n.arrange[0]=1;n.arrange[1]=2;n.arrange[2]=1;expandInstances(p.root,n.id,0);
 const group=p.root.children[0];assert.deepEqual(group.contour,n.contour);assert.ok(group.children.every(c=>c.contour.mode==='none'&&!Object.keys(c.tracks).some(k=>k.startsWith('contour.'))));
 assert.equal(canvasRoot({...p.root,contour:{mode:'erode',radius:.1}}).contour.mode,'none');
});
test('contour filter has bounded logarithmic cost and resolution independent support',()=>{
 for(const [w,h]of [[64,64],[512,256],[4096,4096]]){
  const steps=contourPasses(.04,w,h);assert.ok(steps.length<40);const x=steps.reduce((s,p)=>s+Math.abs(p[0]),0),y=steps.reduce((s,p)=>s+Math.abs(p[1]),0);
  assert.ok(Math.abs(x*w-.04*Math.min(w,h))<1e-8);assert.ok(Math.abs(y*h-.04*Math.min(w,h))<1e-8);
 }assert.deepEqual(contourPasses(0,512,512),[]);
});
