import test from 'node:test';import assert from 'node:assert/strict';
import {BY_ID} from '../web/catalog.js';import {formulaUsesTime,formulaTime} from '../web/formula-time.js';
import {node,project,sanitizeTree,evaluateNode,expandInstances} from '../web/tree-model.js';import {animatablePaths} from '../web/animation-editing.js';
import {builtinAsset,registerAsset,unregisterAsset} from '../web/resource-assets.js';
test('intrinsic time detection ignores static vector wrappers and supports imported formulas',()=>{
 assert.equal(BY_ID.get('FlameShape').usesTime,true);assert.equal(BY_ID.get('Circle').usesTime,false);assert.equal(BY_ID.get('RadialFlow').usesTime,false);
 const asset=builtinAsset('FlameShape');registerAsset('asset_time_probe',asset);try{assert.equal(BY_ID.get('asset_time_probe').usesTime,true);}finally{unregisterAsset('asset_time_probe');}
 assert.equal(formulaUsesTime({outputs:{scalar:{inline:'// time\nreturn 1.;'}}},{}),false);
});
test('manual formula clock survives serialization and keyframe evaluation without mutating authorship',()=>{
 const p=project(),n=node('shape','FlameShape');p.root.children=[n];assert.equal(formulaTime(n,.75),.75);
 n.shapeClock={follow:false,value:2};n.tracks['shapeClock.value']={mode:'absolute',ease:'linear',keys:[[0,3],[1,-1]]};
 const copy=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0];assert.equal(formulaTime(evaluateNode(copy,.5).node,.5),1);assert.equal(n.shapeClock.value,2);
 assert.ok(animatablePaths(n).includes('shapeClock.value'));assert.ok(!animatablePaths(node()).includes('shapeClock.value'));
 n.arrange[0]=1;n.arrange[1]=2;n.arrange[2]=1;expandInstances(p.root,n.id,0);assert.ok(p.root.children[0].children.every(c=>c.shapeClock.follow===false&&c.tracks['shapeClock.value']));
});

test('automatic seconds support speed, reverse, offset and serialization',()=>{
 const p=project(),n=node('shape','FlameShape');p.root.children=[n];n.shapeClock={follow:true,speed:-2,offset:4,value:100};
 assert.equal(formulaTime(n,3),-2);assert.equal(formulaTime(n,6),-8);
 const restored=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0];assert.deepEqual(restored.shapeClock,n.shapeClock);
 n.shapeClock.speed=0;assert.equal(formulaTime(n,999),4);
 n.shapeClock.follow=false;assert.equal(formulaTime(n,999),100);
 assert.ok(animatablePaths(n).includes('shapeClock.speed'));assert.ok(animatablePaths(n).includes('shapeClock.offset'));
});

test('static threshold masks do not expose intrinsic clocks',()=>{
 for(const id of ['DissolveNoise','ErosionMask']){assert.equal(BY_ID.get(id).usesTime,false);assert.ok(!animatablePaths(node('shape',id)).includes('shapeClock.value'));}
 for(const [id,slot] of [['Zigzag',3],['Swirl',3],['Scanlines',2],['DiodeGrid',2]])assert.notEqual(BY_ID.get(id).defaults[slot],0);
});
