import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sources from '../web/shader-reference-runtime.js';
import {SHADER_FIELDS,FILL_STYLES,shaderDefaults,sanitizeShaderParameters,parseShaderSettings,shaderManifest,shaderReferencePackage,referenceGLSL,shaderColor,srgbToLinear,linearToSrgb,sketchShaderParameters} from '../web/shader-reference.js';
import {decodeZIP} from '../web/resource-zip.js';

test.skip('Retired renderer history: reference package retains standalone sources, numeric semantics and AI integration data',async()=>{
 const parameters={...shaderDefaults(),style:4,scrollY:12,inkColor:'#3498db'};
 const png=Uint8Array.from([137,80,78,71,13,10,26,10]);
 const pack=shaderReferencePackage({parameters,mask:png,preview:png,width:1024,height:512,time:1.5}),files=await decodeZIP(pack.bytes);
 const manifest=JSON.parse(new TextDecoder().decode(files.get('parameters.json')));
 assert.deepEqual(parseShaderSettings(JSON.stringify(manifest)),parameters);assert.deepEqual(manifest.designSize,[1024,512]);assert.equal(manifest.input.sRGB,false);assert.equal(manifest.target.engineCompilation,'not-run');
 assert.ok(files.has('mask.png'));assert.ok(files.has('reference-preview.png'));assert.ok(files.has('reference-preview.frag.glsl'));assert.ok(!JSON.stringify(manifest).includes('children'));
 for(const name of ['handdrawn-fill.hlsl','HanddrawnFillURP.shader'])assert.equal(new TextDecoder().decode(files.get(name)),await readFile(new URL('../web/shaders/'+name,import.meta.url),'utf8'));
 assert.equal(manifest.parameters.seed,parameters.seed);assert.equal(manifest.previewTimeSeconds,1.5);
});
test.skip('Retired renderer history: preview math is generated from the shipped HLSL and does not retain HLSL-only tokens',async()=>{
 assert.equal(sources['handdrawn-fill.hlsl'],await readFile(new URL('../web/shaders/handdrawn-fill.hlsl',import.meta.url),'utf8'));
 const glsl=referenceGLSL();assert.ok(glsl.includes('MFHanddrawnFill'));assert.ok(glsl.includes('fwidth'));assert.ok(!/\b(?:float[234]|saturate|frac|fmod|lerp)\s*\(/.test(glsl));assert.ok(sources['HanddrawnFillURP.shader'].includes('#include "handdrawn-fill.hlsl"'));
});
test('reference parameters reject unrelated projects and bound imported values without interpreting text',()=>{
 assert.throws(()=>parseShaderSettings('{"schema":"momo.texture-tree/v1"}'),/参数|settings/);
 const v=sanitizeShaderParameters({style:99,gap:Infinity,width:-2,seed:1.8,inkColor:'red',scrollX:500});assert.equal(v.style,5);assert.equal(v.gap,8);assert.equal(v.width,.25);assert.equal(v.seed,2);assert.equal(v.inkColor,shaderDefaults().inkColor);assert.equal(v.scrollX,64);
 assert.equal(FILL_STYLES.length,6);assert.equal(new Set(SHADER_FIELDS.map(s=>s.key)).size,SHADER_FIELDS.length);
 const m=shaderManifest(shaderDefaults());assert.equal(m.input.meaning,'linear coverage');
});
test('color properties export both display hex and linear math values',()=>{
 assert.ok(Math.abs(shaderColor('#808080')[0]-.21586)<.0001);
 for(const n of [0,.01,.1,.5,1])assert.ok(Math.abs(linearToSrgb(srgbToLinear(n))-n)<1e-6);
});
test('effect export maps supported fills and rejects unsupported styles without substituting',()=>{
 for(const [fillStyle,style]of [[1,0],[2,1],[3,2],[6,3],[7,4],[8,5]])assert.equal(sketchShaderParameters({fillStyle,hatchGap:18,hatchWidth:2,roughness:2.4,fillColor:'#3498db'}).style,style);
 for(const fillStyle of [0,5,9])assert.throws(()=>sketchShaderParameters({fillStyle}),/填充|fill/);
 assert.equal(sketchShaderParameters({fillStyle:4,fillOpacity:1}).inkOpacity,0);
 const mapped=sketchShaderParameters({fillStyle:3,hatchGap:100,hatchWidth:40,roughness:10,fillOpacity:.4});assert.equal(mapped.gap,96);assert.equal(mapped.width,12);assert.equal(mapped.roughness,1);assert.equal(mapped.inkOpacity,.4);
});
test.skip('Retired renderer history: optional baked strokes preserve old packages and declare adjustable versus frozen properties',async()=>{
 const png=Uint8Array.from([137,80,78,71,13,10,26,10]);
 const old=shaderReferencePackage({parameters:shaderDefaults(),mask:png,preview:png,width:512,height:512});assert.equal(old.manifest.stroke,undefined);assert.equal(old.manifest.referenceVersion,1);
 const next=shaderReferencePackage({parameters:shaderDefaults(),mask:png,preview:png,width:512,height:512,time:1.5,stroke:{mask:png,color:'#cf4f35',sourceOpacity:.45}}),files=await decodeZIP(next.bytes);
 assert.ok(files.has('stroke-mask.png'));assert.equal(next.manifest.referenceVersion,2);assert.equal(next.manifest.stroke.input.sRGB,false);assert.equal(next.manifest.stroke.sourceOpacity,.45);assert.equal(next.manifest.stroke.opacity,1);assert.equal(next.manifest.stroke.clippedByFillMask,false);assert.equal(next.manifest.previewTimeSeconds,1.5);
 assert.deepEqual(next.manifest.stroke.runtime,['color','opacity multiplier','node opacity after composition']);assert.equal(next.manifest.stroke.nodeOpacity,1);assert.equal(next.manifest.stroke.opacityAfterComposite,true);assert.equal(next.manifest.target.engineCompilation,'not-run');
 const other=shaderReferencePackage({parameters:shaderDefaults(),mask:png,preview:png,width:512,height:512,stroke:{mask:png,color:'#cf4f35',sourceOpacity:.45}});
 assert.notEqual(next.manifest.unityImporter.type,other.manifest.unityImporter.type);assert.match(new TextDecoder().decode(files.get('MomoHanddrawnImporter.cs')),new RegExp('namespace '+next.manifest.unityImporter.type.slice(0,-'.MomoHanddrawnImporter'.length).replaceAll('.','\\.')));
});

test('retired light/frozen APIs return migration instead of rendering or packaging',()=>{assert.throws(()=>shaderReferencePackage({}),/retired|postprocess/);assert.throws(()=>referenceGLSL(),/retired|postprocess/);});
