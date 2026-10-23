import test from 'node:test';
import assert from 'node:assert/strict';
import rough from '../web/vendor/rough.js';
import {sketchContours,simplifySketchLoop} from '../web/sketch-contours.js';
import {project,node,sanitizeTree,evaluateNode,cloneNode} from '../web/tree-model.js';
import {EFFECT_IDS,effectValues} from '../web/post-effect-specs.js';
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
