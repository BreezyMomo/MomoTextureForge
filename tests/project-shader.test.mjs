import test from 'node:test';
import assert from 'node:assert/strict';
import {project,node} from '../web/tree-model.js';
import {compileProjectShader,projectShaderSupport,SHADER_GRAPHICS,shaderHLSL} from '../web/project-shader-compiler.js';
import {builtinAsset,registerAsset,unregisterAsset} from '../web/resource-assets.js';

test('reviewed shader graphics compile with per-instance properties and no full-catalog switch',async()=>{
 for(const type of SHADER_GRAPHICS){const p=project();p.root.children=[node('shape',type),node('shape',type)];p.root.children[0].params[0]=.31;p.root.children[1].params[0]=.79;
  const before=JSON.stringify(p),compiled=await compileProjectShader(p);assert.equal(JSON.stringify(p),before);assert.equal(compiled.support.supported,true);
  assert.equal(new Set(compiled.properties.map(p=>p.name)).size,compiled.properties.length);
  const values=compiled.mapping.slice(1).map(m=>m.properties.find(p=>p.path==='params.0'));assert.deepEqual(values.map(p=>p.value),[.31,.79]);assert.notEqual(values[0].name,values[1].name);
  assert.ok(!compiled.hlsl.includes('switch(id)'));assert.ok(!compiled.hlsl.includes('vec2'));assert.ok(!/\bpoint\b/.test(compiled.hlsl));
 }
});
test('support rejects each unsupported node explicitly, including disabled nodes, and never returns a partial shader',async()=>{
 for(const [capability,change]of [['keyframes',n=>n.tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,.2],[1,.8]]}],['effect:blur',n=>{n.postEffects.blur.enabled=true;n.postFx[0]=4;}],['graphic',n=>n.type='Star'],['arrangement',n=>n.arrange[0]=1],['timing',n=>n.timing.loop=true],['uv-animation',n=>n.uv[4]=1]]){
  const p=project();p.root.children[0].id='specific-node';change(p.root.children[0]);p.root.children[0].enabled=false;const r=projectShaderSupport(p);assert.equal(r.supported,false);assert.ok(r.issues.some(i=>i.nodeId==='specific-node'&&i.capability===capability));await assert.rejects(compileProjectShader(p),/specific-node/);
 }
});
test('custom resources require the reviewed actual implementation, not a claimed builtin name',async()=>{
 const a=builtinAsset('Circle');a.definition.name='Renamed circle';a.definition.outputs.scalar.inline='return .5;';const id='asset_unreviewed_circle';registerAsset(id,a);
 try{const p=project();p.root.children=[node('shape',id)];assert.equal(projectShaderSupport(p).supported,false);}finally{unregisterAsset(id);}
});
test('dialect adapter handles vector splats and vector swizzles and avoids reserved identifiers',()=>{
 const source='vec3 x=vec3(p.xyx);vec3 y=vec3(.5);vec2 point=vec2(1.);';const hlsl=shaderHLSL(source);
 assert.match(hlsl,/float3\(p.xyx\)/);assert.match(hlsl,/float3\(.5,.5,.5\)/);assert.match(hlsl,/float2 mfPoint/);
});
