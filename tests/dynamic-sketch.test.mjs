import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {project,node} from '../web/tree-model.js';
import {dynamicSketchSupport,projectShaderCapabilities} from '../web/dynamic-sketch-shader.js';
import {projectToolOptions} from '../project-cli.mjs';
const fixture=()=>{const p=project();p.root.children=[node('shape','TurbulentFlame')];p.root.children[0].postEffects.sketch.enabled=true;return p;};
test.skip('Retired dynamic renderer history: live handdrawn support is discoverable and does not mutate native parameters or legacy auto routing',()=>{
 const p=fixture(),before=JSON.stringify(p),r=projectShaderCapabilities(p);assert.equal(r.supported,false);assert.equal(r.modes.dynamicHanddrawn.supported,true);assert.equal(r.recommendedMode,'dynamic-handdrawn');assert.equal(JSON.stringify(p),before);
 assert.equal(projectToolOptions('shader',['--shader-mode','dynamic-handdrawn']).shaderMode,'dynamic-handdrawn');assert.equal(projectToolOptions('shader-support',['--shader-mode','dynamic-handdrawn']).shaderMode,'dynamic-handdrawn');
});
test.skip('Retired dynamic renderer history: live sketch reports each unimplemented feature before export, including disabled nodes',()=>{
 for(const [capability,mutate]of [['scope',(p,n)=>p.root.children.push(node('shape','Circle'))],['contour-source',(p,n)=>n.postEffects.sketch.source=1],['fill-style',(p,n)=>n.postEffects.sketch.fillStyle=3],['pen-options',(p,n)=>n.postEffects.sketch.strokeDashPattern='2 3'],['placement',(p,n)=>n.transform.width=.5],['keyframes',(p,n)=>n.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,1],[1,0]]}],['effect:blur',(p,n)=>{n.postEffects.blur.enabled=true;n.postFx[0]=2;}],['mask',(p,n)=>n.mask=node('group')],['threshold',(p,n)=>n.postEffects.sketch.threshold=0]]){
  const p=fixture(),n=p.root.children[0];n.id='specific-node';mutate(p,n);n.enabled=false;const r=dynamicSketchSupport(p);assert.equal(r.supported,false,capability);assert.ok(r.issues.some(i=>i.capability===capability),JSON.stringify(r));
 }
});
test.skip('Retired dynamic renderer history: runtime performs only explicit diagnostic readback, owns all GPU resources and saves serialized compute references',async()=>{
 const source=await readFile('web/shaders/dynamic/DynamicHanddrawnEffect.cs','utf8'),render=source.slice(source.indexOf('public bool RenderAt'),source.indexOf('public bool RequestDiagnostics'));
 assert.doesNotMatch(render,/GetData\(|AsyncGPUReadback\.Request/);assert.match(source,/public ComputeShader hatchBuilder/);assert.match(source,/ReleaseTexture\(\);ReleaseBrush\(\);Restore\(\)/);assert.match(source,/LastMaxSpans>limit/);
 const compute=await readFile('web/shaders/dynamic/HatchBrush.compute','utf8');assert.match(compute,/InterlockedMax/);assert.match(compute,/ClearDiagnostics/);assert.match(compute,/penPass<2/);assert.match(compute,/Bowing/);
});

test('old dynamic support returns explicit retirement and current project data remains unchanged',()=>{const p=fixture(),before=JSON.stringify(p);assert.equal(dynamicSketchSupport(p).retired,true);assert.equal(JSON.stringify(p),before);});
