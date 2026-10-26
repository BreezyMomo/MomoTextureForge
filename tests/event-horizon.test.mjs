import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleProject} from '../web/project-examples.js';
import {sanitizeTree,node} from '../web/tree-model.js';
import {builtinAsset} from '../web/resource-assets.js';
import {effectStack,effectValues} from '../web/post-effect-specs.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {exportPostEffectShader} from '../web/post-effect-shader.js';
test('Event Horizon separates generation, lens and foreground and retains them through native packaging',async()=>{
 const p=sanitizeTree(exampleProject('examples.eventHorizon.name')),g=p.root.children[0],[bg,hole]=g.children;
 assert.deepEqual(g.children.map(n=>n.type),['EventHorizonNebula','EventHorizonBlackHole']);
 assert.deepEqual(effectStack(bg),['gravitationalLens']);assert.deepEqual(effectStack(hole),[]);assert.deepEqual(effectStack(g),['bloom','vignette']);
 assert.deepEqual(effectValues(bg,'gravitationalLens'),{lensingStrength:.3,magnification:.84,centerX:.54,centerY:.53});
 assert.equal(p.output.seconds,24);
 const nebula=builtinAsset(bg.type);assert.equal(nebula.definition.generator.passes.length,1);assert.ok(!nebula.definition.parameters.some(p=>p.variable==='lensingStrength'));
 for(const n of [bg,hole]){const a=builtinAsset(n.type);assert.equal(a.engineShaders.unity.parameters.length,a.definition.parameters.length);for(const p of a.definition.parameters)assert.ok(p.aliases.en&&p.aliases['zh-CN']);}
 const pack=await readResourcePack(await encodeResourcePack(p));try{assert.deepEqual(effectValues(pack.payload.root.children[0].children[0],'gravitationalLens'),effectValues(bg,'gravitationalLens'));assert.ok(pack.payload.engineShaderModules.gravitationalLens);}finally{pack.rollback();}
 const exported=await exportPostEffectShader('gravitationalLens',{values:effectValues(bg,'gravitationalLens')});assert.equal(JSON.parse(exported.manifest.settings).centerX,.54);
 assert.equal(node().postEffects.gravitationalLens.enabled,false);
});
