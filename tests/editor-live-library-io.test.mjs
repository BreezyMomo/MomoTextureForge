import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLiveLibraryImport} from '../web/editor-live-library-io.js';
import {createLiveLibrary} from '../web/editor-live-library.js';
import {BY_ID,CATALOG} from '../web/catalog.js';
import {bytesHash,bundleKey} from '../web/graphics-library.js';
import {readResourcePack} from '../web/resource-pack.js';

function fixture(){
 let entries=[],writes=0;const bundles=new Map();
 const library=createLiveLibrary({getBuiltins:()=>[BY_ID.get('Circle'),BY_ID.get('BallisticSparks')],readLocal:async()=>entries,readLocalBundle:async key=>bundles.get(key),readSources:async()=>[],readCatalogs:async()=>[],readDownloads:async()=>[]});
 const run=createLiveLibraryImport({library,readLocal:async()=>entries,render:()=>'',save:async(records,{expectedEntries})=>{assert.deepEqual(expectedEntries,entries);writes++;const added=await Promise.all(records.map(async({entry,bytes})=>{bundles.set(bundleKey(entry),bytes);return {...entry,hash:await bytesHash(bytes)};}));entries.push(...added);return added;}});
 return {library,run,bundles,get entries(){return entries;},get writes(){return writes;}};
}
test('native library backup round-trip imports together, skips identical bundles and copies conflicts explicitly',async()=>{
 const f=fixture(),catalogStart=CATALOG.length,{items,revision}=await f.library('library-list'),exported=await f.library('library-export-batch',{keys:items.map(e=>e.key)});
 const args={files:[{name:'backup.zip',data:exported.zip}],expectedLibraryRevision:revision};
 const first=await f.run(args);assert.equal(first.entries.length,2);assert.equal(f.writes,1);assert.equal(CATALOG.length,catalogStart);assert.ok(f.entries.some(e=>e.generator));
 const again=await f.run({...args,expectedLibraryRevision:(await f.library('library-list')).revision});assert.equal(again.applied,false);assert.equal(again.skipped.length,2);assert.equal(f.writes,1);
 f.entries[0].hash='changed';
 const fresh=await f.library('library-list');await assert.rejects(f.run({...args,expectedLibraryRevision:fresh.revision}),/conflict/);assert.equal(f.writes,1);
 const copy=await f.run({...args,expectedLibraryRevision:fresh.revision,conflict:'copy'});assert.equal(copy.entries.length,1);assert.equal(f.entries.length,3);
 const added=copy.entries[0].entry,pack=await readResourcePack(f.bundles.get(bundleKey(added)));try{assert.equal(pack.payload.graphicResource.resourceId,added.resourceId);}finally{pack.rollback();}
});
test('mixed authoring JSON imports are all validated before a single write; invalid batch and stale revision do not save',async()=>{
 const f=fixture(),revision=(await f.library('library-list')).revision,files=await Promise.all(['example.graphic.json','example.generator.json'].map(async name=>({name,data:(await readFile('skills/texture-forge-author/references/'+name)).toString('base64')})));
 await assert.rejects(f.run({expectedLibraryRevision:revision,files:[files[0],{name:'invalid.json',data:Buffer.from('{}').toString('base64')}]}));assert.equal(f.writes,0);
 const result=await f.run({expectedLibraryRevision:revision,files});assert.equal(result.entries.length,2);assert.equal(f.writes,1);
 await assert.rejects(f.run({expectedLibraryRevision:revision,files}),/changed/);assert.equal(f.writes,1);
});
