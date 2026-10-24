import {normalizeDashPattern,SKETCH_FILL_STYLES,sketchOptions,sketchWorkEstimate} from '../web/sketch-options.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import rough from '../web/vendor/rough.js';
import {sketchContours,simplifySketchLoop} from '../web/sketch-contours.js';
import {project,node,sanitizeTree,evaluateNode,cloneNode} from '../web/tree-model.js';
import {EFFECT_IDS,EFFECT_PARAMETERS,effectValues,effectParameterVisible,EFFECT_BY_ID} from '../web/post-effect-specs.js';
import {applySketchFx} from '../web/sketch-fx.js';

const ring=(size=64)=>{const pixels=new Float32Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const d=Math.hypot(x+.5-size/2,y+.5-size/2);pixels[(y*size+x)*4+3]=d<size*.4&&d>size*.2?1:0;}return pixels;};
test('sketch contours retain closed holes and generate deterministic Rough.js geometry',()=>{
 const outline=sketchContours(ring(256),256,256);assert.equal(outline.loops.length,2);assert.equal((outline.path.match(/M/g)??[]).length,2);assert.match(outline.path,/C/);assert.ok(outline.vertices<150);
 const generator=rough.generator(),options={seed:42,roughness:1.3,fill:'#e9b35f',fillStyle:'hachure'};
 assert.deepEqual(generator.path(outline.path,options),rough.generator().path(outline.path,options));assert.notDeepEqual(generator.path(outline.path,options).sets,generator.path(outline.path,{...options,seed:43}).sets);
 const square=[[0,0],[50,0],[100,0],[100,50],[100,100],[0,100]];assert.equal(simplifySketchLoop(square,1).length,4);
});
test('sketch settings, colors and seed animate and travel with components',()=>{
 const p=project(),n=p.root.children[0];n.postEffects.sketch.enabled=true;n.effectOrder=['sketch',...EFFECT_IDS.filter(id=>id!=='sketch')];
 n.postEffects.sketch.seed=2147483646;n.postEffects.sketch.fillStyle=3;n.tracks['postEffects.sketch.roughness']={keys:[[0,0],[1,4]],ease:'linear'};n.tracks['postEffects.sketch.strokeColor']={keys:[[0,'#ff0000'],[1,'#0000ff']],ease:'linear'};
 const restored=sanitizeTree(JSON.parse(JSON.stringify(p))).root.children[0],sample=evaluateNode(restored,.5).node;assert.equal(sample.postEffects.sketch.roughness,2);assert.equal(restored.postEffects.sketch.roughness,1.3);assert.match(sample.postEffects.sketch.strokeColor,/^#[0-9a-f]{6}$/);
 const component=cloneNode(restored);assert.deepEqual(component.postEffects,restored.postEffects);assert.deepEqual(component.effectOrder,restored.effectOrder);assert.equal(component.postEffects.sketch.seed,2147483646);
 assert.equal(effectValues(node(),'sketch').fillStyle,2);
});
test('luminance contours distinguish an opaque image from its alpha silhouette',()=>{
 const pixels=ring();for(let i=0;i<64*64;i++){const at=i*4,value=pixels[at+3];pixels[at]=pixels[at+1]=pixels[at+2]=value;pixels[at+3]=1;}
 assert.equal(sketchContours(pixels,64,64,{source:0}).loops.length,1);assert.equal(sketchContours(pixels,64,64,{source:1}).loops.length,2);
 assert.equal(sketchContours(new Float32Array(64*64*4),64,64).path,'');
});
test('extreme node aspects are rejected before unbounded Rough.js hatch generation',()=>{
 const values=effectValues(node(),'sketch');assert.throws(()=>applySketchFx({gl:{}},{aspect:100000,bounds:[0,0,1,1],w:512,h:1},values),error=>error.messageKey==='fx.sketchDensity');
});

test('all fill modes keep legacy style indices and native fills use seeded geometry',()=>{
 assert.deepEqual(SKETCH_FILL_STYLES.slice(0,5),['original','solid','hachure','cross-hatch','none']);
 const path='M0 0L80 0L80 80L0 80Z',outputs=[];
 for(const fillStyle of ['solid','hachure','cross-hatch','zigzag','dots','dashed','zigzag-line']){
  const options={...sketchOptions(effectValues(node(),'sketch')),fillStyle};
  const a=rough.generator().path(path,options),b=rough.generator().path(path,options);assert.deepEqual(a,b,fillStyle+' is reproducible');outputs.push(JSON.stringify(a.sets));
 }
 assert.equal(new Set(outputs).size,7);
 const parameters=EFFECT_BY_ID.get('sketch').parameters;
 const visible=style=>parameters.filter(p=>effectParameterVisible(p,{fillStyle:style})).map(p=>p.key);
 assert.ok(visible(6).includes('curveStepCount'));assert.ok(!visible(2).includes('curveStepCount'));assert.ok(visible(7).includes('dashLength'));assert.ok(visible(9).includes('sunburstRays'));
});
test('arbitrary dash patterns roundtrip, animate discretely and reject invalid imported values',()=>{
 assert.equal(normalizeDashPattern('8, 4 2，4'),'8 4 2 4');assert.equal(normalizeDashPattern(''),'');
 for(const value of ['-1 2','0 0','Infinity','abc','513',Array(33).fill(1).join(' ')])assert.equal(normalizeDashPattern(value),null);
 const p=project(),n=p.root.children[0];n.postEffects.sketch.strokeDashPattern='8,4,2,4';n.postEffects.sketch.fillDashPattern='2 3';
 n.tracks['postEffects.sketch.strokeDashPattern']={keys:[[0,'8 4'],[1,'2 2 1 2']],ease:'linear'};
 const saved=sanitizeTree(p).root.children[0];assert.equal(saved.postEffects.sketch.strokeDashPattern,'8 4 2 4');assert.equal(evaluateNode(saved,.5).node.postEffects.sketch.strokeDashPattern,'8 4');assert.equal(evaluateNode(saved,1).node.postEffects.sketch.strokeDashPattern,'2 2 1 2');
 assert.deepEqual(cloneNode(saved).postEffects,saved.postEffects);assert.deepEqual(sketchOptions(effectValues(saved,'sketch')).strokeLineDash,[8,4,2,4]);
});
test('dense dots, tiny dash and zigzag segments have bounded generation budgets',()=>{
 const v=effectValues(node(),'sketch');assert.ok(sketchWorkEstimate({...v,fillStyle:6,hatchGap:1},512,512)>200000);assert.ok(sketchWorkEstimate({...v,fillStyle:7,hatchGap:1,dashLength:.1,dashGap:.1},512,512)>200000);assert.ok(sketchWorkEstimate({...v,fillStyle:8,hatchGap:1,zigzagOffset:.1},512,512)>200000);
 for(const fillStyle of [6,7,8])assert.throws(()=>applySketchFx({gl:{}},{aspect:1,bounds:[0,0,1,1]}, {...v,fillStyle,hatchGap:1,dashLength:.1,dashGap:.1,zigzagOffset:.1}),e=>e.messageKey==='fx.sketchDensity');
});

test('outline and fill roughness generate independent seeded brush geometry',()=>{
 const v=effectValues(node(),'sketch'),path='M0 40C0 -10 100 -10 100 40L50 100Z';
 const outline=values=>rough.generator().path(path,{...sketchOptions(values,'stroke'),fill:undefined});
 const fill=values=>rough.generator().path(path,{...sketchOptions(values),stroke:'none',fillStyle:'cross-hatch'});
 const base={...v,strokeRoughness:.2,roughness:5};assert.equal(sketchOptions(base,'stroke').roughness,.2);assert.equal(sketchOptions(base).roughness,5);
 assert.deepEqual(outline(base),outline({...base,roughness:9}));assert.notDeepEqual(outline(base),outline({...base,strokeRoughness:4}));
 assert.deepEqual(fill(base),fill({...base,strokeRoughness:8}));assert.notDeepEqual(fill(base),fill({...base,roughness:.1}));
 for(const fillStyle of [0,4])assert.equal(effectParameterVisible(EFFECT_BY_ID.get('sketch').parameters.find(p=>p.key==='roughness'),{fillStyle}),false);
});

test('legacy shared roughness and all animation modes migrate once into independently editable controls',()=>{
 for(const mode of ['absolute','add','multiply']){
  const p=project(),n=p.root.children[0];delete n.postEffects.sketch.strokeRoughness;n.postEffects.sketch.roughness=2.4;
  n.tracks['postEffects.sketch.roughness']={mode,ease:'smooth',keys:[[0,.4],[1,2]],segments:{'0':{ease:'cubic',out:1},'1':{in:1}}};
  const saved=sanitizeTree(p),s=saved.root.children[0];assert.equal(s.postEffects.sketch.strokeRoughness,2.4);assert.deepEqual(s.tracks['postEffects.sketch.strokeRoughness'],s.tracks['postEffects.sketch.roughness']);
  assert.notEqual(s.tracks['postEffects.sketch.strokeRoughness'],s.tracks['postEffects.sketch.roughness']);
  for(const time of [0,.25,.5,1]){const v=effectValues(evaluateNode(s,time).node,'sketch');assert.equal(v.roughness,v.strokeRoughness);}
  assert.deepEqual(sanitizeTree(JSON.parse(JSON.stringify(saved))).root.children[0].tracks,s.tracks);
  const copy=cloneNode(s);copy.tracks['postEffects.sketch.strokeRoughness'].keys[0][1]=.1;assert.equal(s.tracks['postEffects.sketch.roughness'].keys[0][1],.4);
 }
 const p=project(),n=p.root.children[0];n.postEffects.sketch.roughness=6;n.postEffects.sketch.strokeRoughness=.3;n.tracks['postEffects.sketch.roughness']={keys:[[0,1],[1,5]],ease:'linear'};
 const s=sanitizeTree(p).root.children[0];assert.equal(s.postEffects.sketch.strokeRoughness,.3);assert.equal(s.tracks['postEffects.sketch.strokeRoughness'],undefined);assert.equal(evaluateNode(s,.5).node.postEffects.sketch.strokeRoughness,.3);
});

test('splitting a legacy amplitude track preserves a node already at its authored track limit',()=>{
 const p=project(),n=p.root.children[0];delete n.postEffects.sketch.strokeRoughness;
 const entries=[...EFFECT_PARAMETERS].filter(([path,s])=>path!=='postEffects.sketch.strokeRoughness'&&path!=='postEffects.sketch.roughness'&&typeof s.default==='number'&&!s.type&&!s.options).slice(0,63);
 assert.equal(entries.length,63);n.tracks=Object.fromEntries(entries.map(([path,s])=>[path,{keys:[[0,s.default],[1,s.default]],ease:'linear'}]));n.tracks['postEffects.sketch.roughness']={keys:[[0,1],[1,3]],ease:'linear'};
 const saved=sanitizeTree(p),tracks=saved.root.children[0].tracks;assert.equal(Object.keys(tracks).length,65);for(const path of Object.keys(n.tracks))assert.ok(tracks[path]);
 assert.deepEqual(sanitizeTree(JSON.parse(JSON.stringify(saved))).root.children[0].tracks,tracks);
});
