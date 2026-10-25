import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveAuthoring,editorRevision} from '../web/editor-live-authoring.js';
import {project} from '../web/tree-model.js';

const recipe=(operations)=>({schema:'momo.project-authoring/v1',operations});
const createHeart=recipe([{op:'add-node',id:'ai-heart',graphic:'HeartLeafTeardrop'},{op:'set-effect',node:'ai-heart',effect:'sketch',parameters:{fillStyle:3}}]);
function fixture(){let state=project(),commits=0;const run=createLiveAuthoring({getProject:()=>state,commitProject:p=>{state=p;commits++;}});return {run,get state(){return state;},get commits(){return commits;},revision:()=>editorRevision(JSON.stringify(state))};}

test('live create makes a native heart with sketch; invalid recipes never partially commit',async()=>{
 const f=fixture(),expectedRevision=await f.revision();
 const schema=await f.run('schema');assert.ok(schema.operations['set-effect']);
 const catalog=await f.run('catalog',{graphic:'HeartLeafTeardrop'});assert.equal(catalog.graphics[0].id,'HeartLeafTeardrop');assert.ok(catalog.graphics[0].definition);
 const result=await f.run('edit',{expectedRevision,mode:'create',recipe:createHeart});assert.equal(f.commits,1);assert.equal(result.applied,true);assert.equal(result.editRevision,await f.revision());assert.equal(f.state.root.children.length,1);assert.equal(f.state.root.children[0].postEffects.sketch.fillStyle,3);
 const before=JSON.stringify(f.state);
 await assert.rejects(f.run('edit',{expectedRevision:await f.revision(),recipe:recipe([{op:'add-node',id:'would-be-partial',graphic:'Circle'},{op:'set-effect',node:'ai-heart',effect:'nonexistent'}])}));
 assert.equal(JSON.stringify(f.state),before);assert.equal(f.commits,1);
});
test('stale snapshots, disconnected pages and late UI edits cannot overwrite current work',async()=>{
 const f=fixture(),expectedRevision=await f.revision();f.state.name='User edit';
 await assert.rejects(f.run('edit',{expectedRevision,recipe:createHeart}));assert.equal(f.state.name,'User edit');assert.equal(f.commits,0);
 await assert.rejects(f.run('edit',{expectedRevision:await f.revision(),recipe:createHeart},()=>false));assert.equal(f.commits,0);
 await assert.rejects(f.run('edit',{expectedRevision:await f.revision(),recipe:createHeart},()=>{f.state.name='Late UI edit';return true;}));assert.equal(f.state.name,'Late UI edit');assert.equal(f.commits,0);
});
test('concurrent agents editing the same base allow only one commit',async()=>{
 const f=fixture(),expectedRevision=await f.revision();
 const results=await Promise.allSettled([f.run('edit',{expectedRevision,recipe:createHeart}),f.run('edit',{expectedRevision,recipe:recipe([{op:'add-node',id:'second',graphic:'Circle'}])})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.commits,1);
});
test('catalog pagination is bounded and no-op edits do not add undo steps',async()=>{
 const f=fixture(),a=await f.run('catalog',{limit:2}),b=await f.run('catalog',{offset:2,limit:2});assert.equal(a.graphics.length,2);assert.notEqual(a.graphics[0].id,b.graphics[0].id);assert.equal(a.graphics[0].definition,undefined);
 await assert.rejects(f.run('catalog',{limit:101}));
 assert.equal((await f.run('edit',{expectedRevision:await f.revision(),recipe:recipe([])})).applied,false);assert.equal(f.commits,0);
 await assert.rejects(f.run('edit',{expectedRevision:await f.revision(),recipe:{...createHeart,resources:[{file:'secret.txt'}]}}));
});

test('node-specific schema reports density resource, parameter identities and actual native values',async()=>{
 const f=fixture(),id=f.state.root.children[0].id;
 await f.run('edit',{expectedRevision:await f.revision(),recipe:recipe([{op:'set-density',node:id,graphic:'Star'}])});
 const schema=await f.run('schema',{nodeId:id});assert.equal(schema.currentNode.density.graphic,'Star');
 for(const p of schema.currentNode.density.parameters){assert.ok(p.variable&&p.path);assert.equal(p.value,f.state.root.children[0].arrange[Number(p.path.split('.')[1])]);}
 await f.run('edit',{expectedRevision:await f.revision(),recipe:recipe([{op:'set-density',node:id,parameters:{starPoints:9}}])});
 const updated=await f.run('schema',{nodeId:id});assert.equal(updated.currentNode.density.graphic,'Star');assert.equal(updated.currentNode.density.parameters.find(p=>p.variable==='starPoints').value,9);
 await assert.rejects(f.run('schema',{nodeId:'missing'}));assert.equal((await f.run('schema',{nodeId:'@root'})).currentNode.kind,'group');
});


test('semantic no-ops ignore object key order but retain array order and current revision',async()=>{
 let state=project(),commits=0;
 state=Object.fromEntries(Object.entries(state).reverse());state.root=Object.fromEntries(Object.entries(state.root).reverse());
 const run=createLiveAuthoring({getProject:()=>state,commitProject:p=>{state=p;commits++;}}),expectedRevision=await editorRevision(JSON.stringify(state)),id=state.root.children[0].id;
 for(const count of [0,1,2048]){
  const result=await run('edit',{expectedRevision,recipe:recipe(Array.from({length:count},()=>({op:'patch-node',node:id,values:{opacity:state.root.children[0].opacity}})))});
  assert.equal(result.applied,false);assert.equal(result.editRevision,expectedRevision);assert.equal(commits,0);
 }
 const changed=await run('edit',{expectedRevision,recipe:recipe([{op:'patch-node',node:id,values:{opacity:0.31}}])});assert.equal(changed.applied,true);assert.equal(commits,1);
});
