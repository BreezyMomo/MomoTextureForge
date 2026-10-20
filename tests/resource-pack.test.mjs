import test from 'node:test';import assert from 'node:assert/strict';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {decodeZIP} from '../web/resource-zip.js';
import {encodeZIP} from '../web/encoders.js';
import {builtinAsset,contentHash,resources} from '../web/resource-assets.js';
import {project,node,sanitizeTree} from '../web/tree-model.js';
import {BY_ID} from '../web/catalog.js';
import {fragmentGLSL} from '../web/renderer.js';
import {deflateRawSync} from 'node:zlib';
import {crc32} from '../web/encoders.js';
test('group random instance content survives a portable resource ZIP',async()=>{const p=project(),g=node('group');g.instanceContent='random-child';g.arrange[0]=1;g.arrange[11]=77;g.children=[node(),node()];p.root.children=[g];const pack=await readResourcePack(await encodeResourcePack(p));assert.equal(sanitizeTree(pack.payload).root.children[0].instanceContent,'random-child');assert.equal(pack.payload.root.children[0].arrange[11],77);});
test('project ZIP includes formulas, restores nodes and deduplicates resources',async()=>{
 const p=project();p.root.children.push(node());const bytes=await encodeResourcePack(p),files=await decodeZIP(bytes);
 assert.equal([...files.keys()].filter(p=>p.startsWith('shapes/')).length,1);assert.ok([...files.keys()].some(p=>p.endsWith('.glsl')));
 const pack=await readResourcePack(bytes);pack.register();assert.deepEqual(sanitizeTree(pack.payload),sanitizeTree(p));assert.equal(pack.prepared.length,0);
});
test('same-name changed formula is isolated, re-exportable, rollback does not touch builtin',async()=>{
 const asset=builtinAsset('Circle');asset.definition.outputs.scalar.inline='R*.5';const id='Circle';
 const pack=await readResourcePack(await encodeResourcePack({schema:'momo.texture-assets/v1'},{assets:[[id,asset]]}));pack.register();const custom='asset_'+await contentHash(asset);
 assert.ok(BY_ID.has(custom));assert.equal(BY_ID.get('Circle').definition.outputs.scalar.file!==undefined,true);
 const shader=fragmentGLSL([BY_ID.get(custom).index]);assert.ok(shader.includes('return sat(R*.5)'));
 const p=project();p.root.children=[node('shape',custom)];const again=await readResourcePack(await encodeResourcePack(p));assert.equal(again.prepared.length,0);assert.equal(again.payload.root.children[0].type,custom);
 pack.rollback();assert.equal(resources.has(custom),false);assert.ok(BY_ID.has('Circle'));
});
test('missing and tampered formula resources fail before registration',async()=>{
 const files=await decodeZIP(await encodeResourcePack(project()));const path=[...files.keys()].find(k=>k.endsWith('.glsl'));files.delete(path);
 const encode=()=>encodeZIP([...files].map(([name,data])=>({name,data})));await assert.rejects(readResourcePack(encode()),/缺少资源/);
 files.set(path,new TextEncoder().encode('0.25'));await assert.rejects(readResourcePack(encode()),/校验失败/);
});
test('density source dependency and discrete animation references survive package round trip',async()=>{
 const p=project(),n=p.root.children[0];n.arrange[0]=12;n.arrange[39]=BY_ID.get('ValueNoise').index;n.tracks['arrange.39']={mode:'absolute',ease:'hold',keys:[[0,BY_ID.get('Circle').index],[1,BY_ID.get('Star').index]]};
 const pack=await readResourcePack(await encodeResourcePack(p));pack.register();assert.deepEqual(pack.payload,p);
});
test('ZIP CRC and duplicate entries are rejected',async()=>{
 const bytes=encodeZIP([{name:'a',data:new Uint8Array([1,2])}]);bytes[31]^=1;await assert.rejects(decodeZIP(bytes),/校验失败/);
 await assert.rejects(decodeZIP(encodeZIP([{name:'a',data:new Uint8Array()},{name:'a',data:new Uint8Array()}])),/重复/);
});
test('Deflate ZIP from ordinary archivers is accepted with bounded expansion',async()=>{
 const original=new TextEncoder().encode('formula source '.repeat(100)),compressed=new Uint8Array(deflateRawSync(original));
 const bytes=encodeZIP([{name:'a',data:compressed}]),view=new DataView(bytes.buffer);const central=31+compressed.length;
 view.setUint16(8,8,true);view.setUint32(14,crc32(original),true);view.setUint32(22,original.length,true);
 view.setUint16(central+10,8,true);view.setUint32(central+16,crc32(original),true);view.setUint32(central+24,original.length,true);
 assert.deepEqual((await decodeZIP(bytes)).get('a'),original);
 view.setUint32(central+24,10,true);await assert.rejects(decodeZIP(bytes),/超过声明/);
});
test('empty component-library backup includes unused imported shapes',async()=>{
 const asset=builtinAsset('Circle');asset.definition.name='Unused resource';
 const pack=await readResourcePack(await encodeResourcePack({schema:'momo.texture-assets/v1'},{assets:[['Circle',asset]]}));pack.register();
 try{const files=await decodeZIP(await encodeResourcePack({schema:'momo.texture-library/v1',presets:[]},{includeResources:true}));assert.equal(JSON.parse(new TextDecoder().decode(files.get('manifest.json'))).assets.length,1);}finally{pack.rollback();}
});
