import test from 'node:test';
import assert from 'node:assert/strict';
import {applyProjectRecipe,RECIPE_SCHEMA,authoringCatalog} from '../web/project-authoring.js';
import {project,node} from '../web/tree-model.js';
import {bezierPoint,bezierPoints} from '../web/bezier-path.js';
import {selectionRegions} from '../web/tree-view.js';
import {PALETTES} from '../web/catalog.js';
import {CURVE_PRESETS,CURVE_CHANNELS,curvePreset} from '../web/channel-curves.js';

const run=(p,operations)=>applyProjectRecipe(p,{schema:RECIPE_SCHEMA,operations}).project;
test('copy metadata maps group children and masks including chained component copies without project fields',()=>{
 const p=project(),g=node('group');g.children=[node()];g.mask=node();p.root.children=[g];
 const result=applyProjectRecipe(p,{schema:RECIPE_SCHEMA,operations:[{op:'duplicate-node',node:g.id,id:'copy'},{op:'add-component',resource:'fixture',id:'component'}]},{components:new Map([['fixture',g]])});
 for(const id of ['copy','component']){const target=result.project.root.children.find(n=>n.id===id);for(const [a,b]of [[g,target],[g.children[0],target.children[0]],[g.mask,target.mask]])assert.ok(result.shortcutCopies.some(([from,to])=>from===a.id&&to===b.id));}
 assert.equal(result.project.shortcutCopies,undefined);
});
test('gradient presets/reversal and channel curve presets reuse native data and retain unrelated settings',()=>{
 const p=project(),n=p.root.children[0];n.color.mode='own';n.color.fill='gradient';n.tracks['color.low']={type:'color',keys:[[0,'#112233'],[1,'#445566']],ease:'linear',mode:'absolute'};
 for(const preset of PALETTES){
  const out=run(p,[{op:'gradient',node:n.id,action:'preset',preset:preset.nameKey}]);assert.deepEqual(out.root.children[0].color.stops,preset.stops);assert.deepEqual(out.root.children[0].tracks,n.tracks);
  const reversed=run(out,[{op:'gradient',node:n.id,action:'reverse'}]),back=run(reversed,[{op:'gradient',node:n.id,action:'reverse'}]);assert.deepEqual(back.root.children[0].color,out.root.children[0].color);
  const restored=run(reversed,[{op:'gradient',node:n.id,action:'restore-endpoints'}]).root.children[0];assert.equal(restored.color.stops,undefined);assert.equal(restored.color.low,preset.stops.at(-1).color);assert.equal(restored.color.high,preset.stops[0].color);
 }
 const swapped=run(p,[{op:'gradient',node:n.id,action:'reverse'}]).root.children[0];assert.equal(swapped.color.low,n.color.high);assert.equal(swapped.color.high,n.color.low);assert.equal(swapped.color.stops,undefined);
 for(const preset of CURVE_PRESETS)for(const channel of CURVE_CHANNELS){
  const out=run(p,[{op:'curves',node:n.id,action:'preset',channel,preset}]);assert.deepEqual(out.root.children[0].curves[channel],curvePreset(preset));assert.equal(out.root.children[0].curves.enabled,true);
  const reset=run(out,[{op:'curves',node:n.id,action:'reset',channel}]).root.children[0];assert.deepEqual(reset.curves[channel],[[0,0],[1,1]]);assert.equal(reset.curves.enabled,true);
  assert.equal(run(out,[{op:'curves',node:n.id,action:'reset-all'}]).root.children[0].curves.enabled,false);
 }
 const before=JSON.stringify(p);assert.throws(()=>run(p,[{op:'gradient',node:n.id,action:'preset',preset:'missing'}]));assert.throws(()=>run(p,[{op:'curves',node:n.id,action:'preset',channel:'missing',preset:'linear'}]));assert.equal(JSON.stringify(p),before);
});
test('native key recording, mode conversion, templates and key edits preserve unrelated tracks and fail atomically',()=>{
 const p=project(),n=p.root.children[0];n.opacity=.4;n.tracks.opacity={mode:'add',ease:'linear',keys:[[0,0]]};
 let out=run(p,[{op:'record-key',node:n.id,path:'opacity',time:.5,value:.6},{op:'convert-track',node:n.id,path:'opacity',mode:'absolute'},{op:'animation-template',node:n.id,template:'pulse'}]);
 assert.equal(out.root.children[0].tracks.opacity.keys[1][1],.6);assert.ok(out.root.children[0].tracks['transform.width']);
 out=run(out,[{op:'edit-keys',edits:[{id:n.id,path:'opacity',from:.5,to:.75}]}]);assert.deepEqual(out.root.children[0].tracks.opacity.keys,[[0,.4],[.75,.6]]);
 const before=JSON.stringify(out);assert.throws(()=>run(out,[{op:'edit-keys',edits:[{id:n.id,path:'opacity',from:.75,to:0}]}]),/already|关键帧/);assert.equal(JSON.stringify(out),before);
 assert.throws(()=>run(p,[{op:'animation-template',node:'@root',template:'pulse'}]),/non-root/);
});
test('Bezier split preserves curve, point moves carry adjacent handles and animated topology is locked',()=>{
 const p=project(),n=node('shape','BezierRibbon');p.root.children=[n];
 const original=bezierPoints(n,'shape');let out=run(p,[{op:'bezier-edit',node:n.id,kind:'shape',action:'split',segment:0}]);
 assert.equal(out.root.children[0].bezier.shape.length,6);const points=bezierPoints(out.root.children[0],'shape');
 for(const t of [0,.1,.5,.8,1])assert.ok(bezierPoint(original,t).every((v,i)=>Math.abs(v-bezierPoint(points,t)[i])<1e-10));
 out=run(out,[{op:'bezier-edit',node:n.id,kind:'shape',action:'move',index:3,x:.25,y:.5},{op:'bezier-edit',node:n.id,kind:'shape',action:'extend'}]);assert.equal(out.root.children[0].bezier.shape.length,12);
 out.root.children[0].tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,0],[1,1]]};assert.throws(()=>run(out,[{op:'bezier-edit',node:n.id,kind:'shape',action:'split',segment:0}]),/unanimated/);
 assert.throws(()=>run(p,[{op:'bezier-edit',node:n.id,kind:'shape',action:'remove',index:1}]),/anchor/);
});
test('native alignment crosses parents and expansion preserves owning node and effects',()=>{
 const p=project(),g=node('group'),a=node(),b=node();g.transform.x=.6;g.transform.width=.6;a.transform.x=.2;a.transform.width=.2;b.transform.x=.7;b.transform.width=.2;g.children=[a];p.root.children=[g,b];
 const out=run(p,[{op:'layout-nodes',nodes:[a.id,b.id],operation:'centerX',reference:'canvas'}]);
 for(const id of [a.id,b.id])assert.ok(Math.abs(selectionRegions(out,id,0).regions[0].center[0]-.5)<1e-8);
 b.arrange[0]=8;b.arrange[3]=4;b.arrange[33]=1;b.postEffects.blur.enabled=true;b.postFx[0]=2;
 const expanded=run(p,[{op:'expand-arrangement',node:b.id}]).root.children[1];assert.equal(expanded.id,b.id);assert.equal(expanded.kind,'group');assert.equal(expanded.children.length,4);assert.equal(expanded.postFx[0],2);assert.ok(expanded.children.every(n=>n.arrange[0]===0));
});
test('effect reset retains animation, inherited colors become independent and catalog ribbon presets are executable',()=>{
 const p=project(),g=node('group'),n=p.root.children[0];g.color={mode:'own',fill:'solid',high:'#123456',low:'#000000'};g.children=[n];p.root.children=[g];n.tracks['postEffects.blur.enabled']={mode:'absolute',ease:'hold',keys:[[0,true]]};n.postFx[0]=5;
 const out=run(p,[{op:'independent-color',node:n.id},{op:'reset-effects',node:n.id,effect:'blur'}]).root.children[0].children[0];assert.equal(out.color.high,'#123456');assert.equal(out.color.mode,'own');assert.ok(out.tracks['postEffects.blur.enabled']);assert.notEqual(out.postFx[0],5);
 const ribbon=authoringCatalog({}).graphics.find(g=>g.ribbonPresets);assert.ok(ribbon);p.root.children=[node('shape',ribbon.id)];const preset=run(p,[{op:'ribbon-preset',node:p.root.children[0].id,preset:ribbon.ribbonPresets[0].id}]);assert.equal(preset.root.children[0].params.length,ribbon.defaults.length);
});
