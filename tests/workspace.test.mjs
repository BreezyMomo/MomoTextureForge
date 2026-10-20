import test from "node:test";
import assert from "node:assert/strict";
import { defaults, newLayer } from "../web/state.js";
import { encodeProject,decodeProject,preferences,recentTypes,arrangeShortcut,exportSummary } from "../web/workspace-model.js";

test("project files preserve extended curves, masks, arrangements, alpha and tracks; legacy states migrate",()=>{
  const state=defaults();state.layers[0]=newLayer("BezierRibbon");state.layers[0].mask="Leaf";state.layers[0].maskParams=[...newLayer("Leaf").params];state.layers[0].arrange[0]=2;state.output.alpha=true;state.output.mode=3;state.output.channels=[0,2,3,0];state.animation.tracks={"layers.0.params.11":[[0,.1],[3,1]]};
  const project=decodeProject(encodeProject(state," 测试项目 "));
  assert.equal(project.name,"测试项目");assert.deepEqual(project.state,state);
  assert.deepEqual(decodeProject(encodeProject(state,"项目",undefined,{kind:"atlas",format:"exr"})).export,{kind:"atlas",format:"exr"});
  assert.deepEqual(decodeProject(encodeProject(state,"项目",undefined,{kind:"frames",format:"exr"})).export,{kind:"frames",format:"png"});
  state.version=4;state.layers[0]=newLayer("Star");assert.equal(decodeProject(JSON.stringify(state)).state.layers[0].params[5],2);
  for(const file of ['null','{}','{"schema":"foreign","layers":[]}',JSON.stringify({schema:"momo-texture-project/v1",state:{version:99,layers:[]}})])assert.throws(()=>decodeProject(file));
  assert.throws(()=>decodeProject(' '.repeat(2_000_001)));
});
test("UI preferences are separate, bounded and preserve valid favorite/recent ordering",()=>{
  assert.equal(preferences().autosave,true);
  const p=preferences({libraryView:"grid",libraryFilter:"recent",favorites:["Leaf","Leaf","bad"],recent:["Circle","Leaf"],previewBackground:"white",autosave:false});
  assert.deepEqual(p.favorites,["Leaf"]);assert.equal(p.libraryView,"grid");assert.equal(p.autosave,false);
  assert.deepEqual(recentTypes(p.recent,"Leaf"),["Leaf","Circle"]);
  assert.equal(preferences({previewBackground:"javascript:bad",libraryFilter:"bad"}).previewBackground,"checker");
});
test("layout shortcuts center without changing size and fit grid/radial without overwriting input",()=>{
  const a=defaults().layers[0].arrange;a[0]=1;a[1]=3;a[2]=2;a[4]=.7;a[6]=45;a[8]=.8;a[13]=.3;a[14]=-.4;
  const centered=arrangeShortcut(a,"center");assert.equal(centered[4],.7);assert.equal(centered[6],45);assert.equal(centered[13],0);assert.equal(centered[14],0);
  const fitted=arrangeShortcut(a,"fill");assert.equal(fitted[5],.5);assert.equal(fitted[4],.31);assert.equal(fitted[8],0);assert.equal(fitted[6],0);assert.equal(a[13],.3);
  a[0]=2;a[3]=8;assert.equal(arrangeShortcut(a,"fill")[4],.2);
  for(const mode of [3,7,12]){a[0]=mode;a[5]=.38;a[9]=.4;a[10]=75;a[11]=42;const before=structuredClone(a),full=arrangeShortcut(a,'fill');assert.equal(full[5],.5);assert.equal(full[13],0);assert.equal(full[14],0);for(const slot of [0,3,4,6,8,9,10,11])assert.equal(full[slot],before[slot]);assert.deepEqual(a,before);}
});
test("output summaries match dimensions, precision, alpha, frame count and fixed batch sizes",()=>{
  const s=defaults();s.output.aspect=2;s.output.alpha=true;s.output.precision=16;s.flipbook={columns:3,rows:2,cell:64};
  assert.match(exportSummary(s),/1024 × 512.*PNG16.*透明/);
  assert.match(exportSummary(s,"atlas","exr"),/192 × 128.*half.*6 帧/);
  assert.match(exportSummary(s,"frames"),/6 帧.*64×64/);
  assert.match(exportSummary(s,"batch"),/256 \/ 512 \/ 1024/);
  s.output.mode=2;assert.match(exportSummary(s),/不透明/);
  s.output.mode=3;s.output.channels[3]=0;assert.match(exportSummary(s),/A 通道：高度/);
});
