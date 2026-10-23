import test from 'node:test';
import assert from 'node:assert/strict';
import {effectSamples} from '../web/effect-samples.js';
import {project,sanitizeTree,walk,fieldSpec,evaluateNode,animationType} from '../web/tree-model.js';
import {BY_ID} from '../web/catalog.js';

test('effect presets retain editable resources, tracks and export settings after serialization',()=>{
 const samples=effectSamples();assert.equal(samples.length,12);assert.equal(new Set(samples.map(s=>s.nameKey)).size,12);
 for(const sample of samples){
  const p=project();p.name=sample.name;p.root.children=[sample.root];Object.assign(p.output,sample.output);
  assert.deepEqual(sanitizeTree(JSON.parse(JSON.stringify(p))),p,sample.name);
  assert.equal(p.output.alpha,true);assert.equal(p.output.exportSeconds,p.output.seconds);assert.equal(p.output.frames,Math.round(p.output.exportSeconds*p.output.fps)+(p.output.loopExport?0:1));
  const atlasWidth=p.output.width*p.output.columns,atlasHeight=p.output.height*Math.ceil(p.output.frames/p.output.columns);
  assert.ok(atlasWidth<=8192&&atlasHeight<=8192&&atlasWidth*atlasHeight<=16777216,sample.name+' default atlas must fit the export budget');
  assert.ok(p.output.width*p.output.height*p.output.frames<=33554432,sample.name+' sequence must fit the sampling budget');
  walk(sample.root,n=>{
   if(n.kind==='shape')assert.ok(BY_ID.has(n.type),n.type);
   for(const [path,track]of Object.entries(n.tracks)){
    const bounds=fieldSpec(n,path);assert.ok(bounds,`${sample.name}: ${path}`);
    if(animationType(n,path)==='number')for(const [t,value]of track.keys){assert.ok(t>=0&&t<=1);assert.ok(value>=bounds[0]&&value<=bounds[1],`${sample.name}: ${path}=${value}`);}
   }
  });
 }
});

test('ring controls preserve legacy slot defaults and use discrete waveform animation',()=>{
 const type=BY_ID.get('RadialStreak');assert.deepEqual(type.defaults.slice(0,4),[14,.35,.06,.9]);
 for(const variable of ['baseRadius','flowSpeed','phase','ringWidth'])assert.equal(type.parameters.find(p=>p.variable===variable).default,0);
 const sample=effectSamples().find(s=>s.name==='液态波纹'),n=sample.root.children[1];
 assert.equal(animationType(n,'params.4'),'discrete');n.tracks['params.4']={mode:'absolute',ease:'linear',keys:[[0,0],[.5,2],[1,1]]};
 const p=project();p.root.children=[n];const clean=sanitizeTree(p).root.children[0];
 assert.equal(evaluateNode(clean,.25).node.params[4],0);assert.equal(evaluateNode(clean,.75).node.params[4],2);
});
