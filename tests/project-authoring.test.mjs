import test from 'node:test';
import assert from 'node:assert/strict';
import {applyProjectRecipe,authoringCatalog,authoringSchema,RECIPE_SCHEMA,parameterPath,safeData} from '../web/project-authoring.js';
import {authoringOptions} from '../project-authoring-cli.mjs';
import {node,find,nodeClock,shapeDefaults} from '../web/tree-model.js';
import {RECIPE_LIMITS,validateRecipe} from '../web/project-authoring-contract.js';
import {effectStack} from '../web/post-effect-specs.js';
const recipe=operations=>({schema:RECIPE_SCHEMA,operations});
const add=(id='circle')=>({op:'add-node',id,graphic:'Circle'});
const run=ops=>applyProjectRecipe(null,recipe(ops));
test('offline catalog/schema come from actual installed definitions and editor defaults',()=>{
 const c=authoringCatalog({graphic:'Circle'});assert.equal(c.graphics.length,1);assert.ok(c.graphics[0].parameters.every(p=>p.variable&&p.path));
 assert.ok(authoringCatalog({query:'Circle'}).graphics.length>0);assert.throws(()=>authoringCatalog({graphic:'does-not-exist'}));
 const schema=authoringSchema();assert.equal(schema.projectDefaults.root.children.length,0);assert.ok(schema.effects.length>=31);assert.ok(schema.operations['set-mask']);
});
test('create native layered project, stable parameters, effects order, tracks and mask',()=>{
 const param=authoringCatalog({graphic:'Circle'}).graphics[0].parameters[0].variable;
 const r=run([{op:'set-project',name:'AI project',canvas:{ratio:2},output:{seconds:2,exportSeconds:2}},
  {op:'add-node',id:'group',kind:'group'}, {...add(),parent:'group',values:{transform:{x:.3},color:{mode:'own',high:'#aabbcc'}},parameters:{[param]:.25}},
  {op:'set-effect',node:'group',effect:'blur',parameters:{radius:2}}, {op:'set-effect',node:'group',effect:'bloom',parameters:{strength:.3}},
  {op:'reorder-effects',node:'group',effects:['bloom','blur']},
  {op:'set-track',node:'circle',path:'opacity',track:{keys:[[0,0],[1,1]]}},add('mask'),{op:'set-mask',node:'group',mask:'mask'}]);
 assert.equal(r.project.schema,'momo.texture-tree/v1');assert.equal(r.project.canvas.ratio,2);const group=find(r.project.root,'group').node,circle=find(r.project.root,'circle').node;
 assert.equal(group.mask.id,'mask');assert.equal(circle.transform.x,.3);assert.equal(circle.params[0],.25);assert.deepEqual(effectStack(group),['bloom','blur']);assert.equal(nodeClock(r.project.root,'circle',.5).node.opacity,.5);
 assert.ok(!r.normalizations.some(n=>n.path.endsWith('params.0')));assert.equal(parameterPath(circle,param),'params.0');
});
test('edit clone does not mutate input; duplicate generates new descendant IDs',()=>{
 const p=run([{op:'add-node',id:'group',kind:'group'},{...add(),parent:'group'}]).project,before=JSON.stringify(p);
 const r=applyProjectRecipe(p,recipe([{op:'duplicate-node',node:'group',id:'copy'},{op:'patch-node',node:'copy',values:{opacity:.3}}]));
 assert.equal(JSON.stringify(p),before);assert.notEqual(find(r.project.root,'copy').node.children[0].id,'circle');assert.equal(r.project.root.children.length,2);
});
test('groups preserve sibling stacking order and ungroup refuses data loss',()=>{
 const r=run([add('a'),add('b'),add('c'),{op:'group-nodes',nodes:['c','a'],id:'g'}]);assert.deepEqual(r.project.root.children.map(n=>n.id),['g','b']);assert.deepEqual(r.project.root.children[0].children.map(n=>n.id),['a','c']);
 const u=applyProjectRecipe(r.project,recipe([{op:'ungroup-node',node:'g'}]));assert.deepEqual(u.project.root.children.map(n=>n.id),['a','c','b']);
 assert.throws(()=>applyProjectRecipe(r.project,recipe([{op:'set-effect',node:'g',effect:'blur'},{op:'ungroup-node',node:'g'}])),/lose group properties/);
});
test('native values support arrangement, UV, bezier and gradient data',()=>{
 const r=run([{...add(),values:{arrange:[1,3,2],uv:[2,15,.1,0,0,0,0],bezier:{shape:[0,0,10,10]},color:{stops:[{position:0,color:'#ff0000'},{position:1,color:'#00ff00'}]}}}]);
 const n=r.project.root.children[0];assert.equal(n.arrange[0],1);assert.equal(n.uv[0],2);assert.equal(n.color.stops.length,2);
});
test('reusable components stay editable, with fresh IDs',()=>{
 const component=node('group');component.children=[node()];const r=applyProjectRecipe(null,recipe([{op:'add-component',id:'badge',resource:'source'}]),{components:new Map([['source',component]])});
 assert.equal(r.project.root.children[0].kind,'group');assert.equal(r.project.root.children[0].children.length,1);assert.notEqual(r.project.root.children[0].children[0].id,component.children[0].id);
});
test('sanitizer adjustments are reported instead of silently disappearing',()=>{
 const r=run([{...add(),values:{opacity:8,transform:{width:3}}}]);assert.equal(r.project.root.children[0].opacity,1);assert.ok(r.normalizations.some(n=>n.path==='root.children.0.opacity'&&n.requested===8&&n.stored===1));
});
test('density selection uses actual resource IDs and survives sanitizing',()=>{
 const r=run([add(),{op:'set-density',node:'circle',graphic:'Star'}]);const n=r.project.root.children[0];assert.equal(n.arrange[39],authoringCatalog().graphics.findIndex(g=>g.id==='Star'));
});

test('density uses stable variables and roles, native defaults on changes, and reports actual paths',()=>{
 const target=authoringCatalog({graphic:'Star'}).graphics[0],param=target.parameters[0];
 assert.equal(param.densityPath,'arrange.'+(42+param.slot));
 const source=run([add(),{op:'set-density',node:'circle',graphic:'Star',parameters:{[param.variable]:param.min}}]).project;
 assert.equal(source.root.children[0].arrange[42+param.slot],param.min);
 const same=applyProjectRecipe(source,recipe([{op:'set-density',node:'circle',graphic:'Star'}]));assert.deepEqual(same.project,source);
 const roleParam=target.parameters.find(p=>p.role),changed=applyProjectRecipe(source,recipe([{op:'set-density',node:'circle',parameters:{[roleParam.role]:roleParam.max}}]));assert.equal(changed.project.root.children[0].arrange[42+roleParam.slot],roleParam.max);assert.equal(changed.project.root.children[0].arrange[39],source.root.children[0].arrange[39]);
 const circle=authoringCatalog({graphic:'Circle'}).graphics[0],switched=applyProjectRecipe(source,recipe([{op:'set-density',node:'circle',graphic:'Circle'}])).project;
 for(const p of circle.parameters)assert.equal(switched.root.children[0].arrange[42+p.slot],p.default);
 const before=JSON.stringify(source);
 for(const op of [{op:'set-density',node:'circle',parameters:{unknown:1}},{op:'set-density',node:'circle',parameters:[]},{op:'set-density',node:'@root',graphic:'Star'}])assert.throws(()=>applyProjectRecipe(source,recipe([op])));
 assert.equal(JSON.stringify(source),before);
});

test('non-animation enums expose native values and group-only applicability',()=>{
 const fields=authoringSchema().fields;
 assert.deepEqual(fields.instanceContent.options,['all','random-child','cycle-child']);assert.deepEqual(fields.instanceContent.appliesTo,['group']);assert.equal(fields.instanceContent.animationType,null);
 for(const value of fields.instanceContent.options){const p=run([{op:'add-node',id:'g',kind:'group',values:{instanceContent:value}}]).project;assert.equal(p.root.children[0].instanceContent,value);}
 assert.deepEqual(fields['timing.before'].options,['hold','hide']);assert.deepEqual(fields.imageFit.options,['contain','stretch']);
});
test('reject invalid graph, field, effect, parameter and track operations',()=>{
 const cases=[
  [add(),add()], [add(),{op:'add-node',id:'child',parent:'circle',graphic:'Circle'}],
  [add(),{op:'patch-node',node:'circle',values:{opacityTypo:1}}], [add(),{op:'set-parameter',node:'circle',parameter:'a typo',value:1}],
  [add(),{op:'set-effect',node:'circle',effect:'blur',parameters:{raduis:2}}],
  [add(),{op:'reorder-effects',node:'circle',effects:['blur']}],
  [add(),{op:'set-track',node:'circle',path:'opacity',track:{keys:[[2,1]]}}],
  [add(),{op:'set-track',node:'circle',path:'opacity',track:{keys:[[0,'oops']]}}],
  [add(),{op:'set-track',node:'circle',path:'opacity',track:{keys:[[0,0],[0,1]]}}],
  [{op:'add-node',id:'g',kind:'group'},{op:'add-node',id:'g2',kind:'group',parent:'g'},{op:'move-node',node:'g',parent:'g2'}],
  [add(),{op:'set-effect',node:'@root',effect:'bloom'}], [add(),{op:'set-mask',node:'circle',mask:'@root'}],
 ];for(const ops of cases)assert.throws(()=>run(ops));
 assert.throws(()=>safeData(JSON.parse('{"__proto__":{"polluted":true}}')));assert.equal({}.polluted,undefined);
 assert.throws(()=>run([JSON.parse('{"op":"patch-node","node":"@root","values":{"constructor":{}}}')]));
});
test('offline CLI validates options and protects input files',()=>{
 assert.equal(authoringOptions('catalog',['--id','Circle']).id,'Circle');assert.equal(authoringOptions('create',['recipe.json']).file,'recipe.json');
 assert.throws(()=>authoringOptions('edit',['scene.zip']),/operations/);assert.throws(()=>authoringOptions('edit',['scene.zip','--operations','ops.json','--output','scene.zip']),/different/);
 assert.throws(()=>authoringOptions('create',['scene.json','--output','out.png']));assert.throws(()=>authoringOptions('schema',['--from','x.zip']));assert.throws(()=>authoringOptions('catalog',['--timeout','NaN']));
});

test('set-graphic preserves identity, mask, effect stack, reference and unrelated animation',()=>{
 const source=run([{op:'add-node',id:'heart',graphic:'HeartLeafTeardrop',name:'My shape',values:{resourceRef:'shelf-reference',transform:{x:.3,rotation:20},color:{mode:'own',high:'#ff0000'}}},add('mask'),{op:'set-mask',node:'heart',mask:'mask'},
  {op:'set-effect',node:'heart',effect:'sketch',parameters:{fillStyle:3}},
  {op:'set-track',node:'heart',path:'params.0',track:{keys:[[0,.3],[1,.7]]}},
  {op:'set-track',node:'heart',path:'opacity',track:{keys:[[0,.2],[1,1]]}}]).project;
 const before=structuredClone(source),old=find(source.root,'heart').node;
 const changed=applyProjectRecipe(source,recipe([{op:'set-graphic',node:'heart',graphic:'Star'}])),star=find(changed.project.root,'heart').node;
 assert.deepEqual(source,before);assert.equal(star.type,'Star');assert.deepEqual(star.params,shapeDefaults('Star'));assert.equal(star.tracks['params.0'],undefined);
 for(const key of Object.keys(old).filter(k=>!['type','params','tracks'].includes(k)))assert.deepEqual(star[key],old[key],key);
 assert.deepEqual(star.tracks.opacity,old.tracks.opacity);assert.deepEqual(changed.graphicChanges,[{operation:0,node:'heart',from:'HeartLeafTeardrop',to:'Star',parametersReset:true,removedParameterTracks:['params.0']}]);
 const schema=authoringSchema();assert.deepEqual(schema.operations['set-graphic'],['node','graphic','parameters']);assert.ok(schema.patchNode.blockedFields.includes('type'));assert.ok(schema.patchNode.blockedFields.includes('params'));assert.deepEqual(schema.recipeLimits,RECIPE_LIMITS);
});

test('set-graphic same-type calls preserve parameter animation and accept target parameter overrides',()=>{
 const variable=authoringCatalog({graphic:'Circle'}).graphics[0].parameters[0].variable;
 const source=run([add(),{op:'set-parameter',node:'circle',parameter:variable,value:.28},{op:'set-track',node:'circle',parameter:variable,track:{keys:[[0,.2],[1,.4]]}}]).project;
 const same=applyProjectRecipe(source,recipe([{op:'set-graphic',node:'circle',graphic:'Circle'}]));assert.deepEqual(same.project,source);assert.deepEqual(same.graphicChanges,[]);
 const changed=applyProjectRecipe(source,recipe([{op:'set-graphic',node:'circle',graphic:'Circle',parameters:{[variable]:.35}}]));assert.equal(changed.project.root.children[0].params[0],.35);assert.deepEqual(changed.project.root.children[0].tracks,source.root.children[0].tracks);
 const target=authoringCatalog({graphic:'Star'}).graphics[0].parameters[0];
 const switched=applyProjectRecipe(source,recipe([{op:'set-graphic',node:'circle',graphic:'Star',parameters:{[target.variable]:target.default}}]));assert.equal(switched.project.root.children[0].type,'Star');
 for(const op of [{op:'set-graphic',node:'@root',graphic:'Star'},{op:'set-graphic',node:'circle',graphic:'missing'},{op:'set-graphic',node:'circle',graphic:'Star',parameters:{missing:1}},{op:'set-graphic',node:'circle',graphic:'Star',parameters:[]}])assert.throws(()=>applyProjectRecipe(source,recipe([op])));
});

test('recipes reject excessive UTF-8 size, depth, members and operations before mutation',()=>{
 assert.doesNotThrow(()=>validateRecipe(recipe([])));
 assert.throws(()=>validateRecipe({...recipe([]),name:'界'.repeat(RECIPE_LIMITS.bytes/3+1)}),/UTF-8 bytes/);
 let nested={};for(let i=0;i<RECIPE_LIMITS.depth+1;i++)nested={child:nested};assert.throws(()=>validateRecipe({...recipe([]),nested}),/depth/);
 assert.throws(()=>validateRecipe({...recipe([]),values:Array(RECIPE_LIMITS.elements).fill(0)}),/elements/);
 assert.throws(()=>validateRecipe(recipe(Array(RECIPE_LIMITS.operations+1).fill({op:'set-project',name:'x'}))),/operations/);
 const cycle={};cycle.self=cycle;assert.throws(()=>validateRecipe(cycle),/depth/);
});
