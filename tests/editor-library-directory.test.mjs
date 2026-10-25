import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {EditorLibraryDirectories,NodeLibraryStore} from '../editor-library-directory.mjs';
import {encodeResourcePack} from '../web/resource-pack.js';
import {node,PRESET_SCHEMA} from '../web/tree-model.js';

test('native directory manager previews, commits, restores, exports and explicitly deletes isolated files',async()=>{
 await mkdir('test-results/directory-manager',{recursive:true});const base=await mkdtemp(resolve('test-results/directory-manager/run-')),directory=join(base,'library'),cache=join(base,'cache');await mkdir(directory);await mkdir(cache);
 const manager=new EditorLibraryDirectories(async()=>cache),opened=await manager.open(directory);assert.equal(opened.revision,'missing');assert.equal((await manager.open(directory)).handleId,opened.handleId);
 const resourceId=crypto.randomUUID(),meta={resourceId,versionId:1,personalRevision:0,name:'Fixture',kind:'formula',category:'Test',description:''},file=join(base,'fixture.zip');await writeFile(file,await encodeResourcePack({schema:PRESET_SCHEMA,name:meta.name,root:node(),graphicResource:meta}));
 const preview=await manager.execute({handleId:opened.handleId,action:'preview-import',expectedRevision:'missing',inputFiles:[file]});assert.equal(preview.changes.length,1);await assert.rejects(readFile(join(directory,'index.json')),e=>e.code==='ENOENT');
 let current=await manager.execute({handleId:opened.handleId,action:'apply-import',expectedRevision:'missing',previewId:preview.previewId});assert.equal(current.index.entries.length,1);const original=current.revision,resourceFile=join(directory,current.index.entries[0].file);assert.ok((await readFile(resourceFile)).length>100);
 await assert.rejects(manager.execute({handleId:opened.handleId,action:'rename',expectedRevision:'missing',name:'Stale'}));
 const withdrawn=await manager.execute({handleId:opened.handleId,action:'withdraw',expectedRevision:current.revision,resourceIds:[resourceId]});assert.equal(withdrawn.index.entries.length,0);assert.ok((await readFile(resourceFile)).length>100);
 const history=await manager.execute({handleId:opened.handleId,action:'history'}),prior=history.snapshots.find(s=>s.entries===1);assert.ok(prior);
 current=await manager.execute({handleId:opened.handleId,action:'restore',expectedRevision:withdrawn.revision,historyId:prior.id});assert.equal(current.revision,original);
 const exported=await manager.execute({handleId:opened.handleId,action:'export-index',expectedRevision:current.revision});assert.deepEqual(JSON.parse(await readFile(exported.file,'utf8')),current.index);
 await assert.rejects(manager.execute({handleId:opened.handleId,action:'delete-files',expectedRevision:current.revision,resourceIds:[resourceId]}),/confirmDeleteFiles/);
 const deleted=await manager.execute({handleId:opened.handleId,action:'delete-files',expectedRevision:current.revision,resourceIds:[resourceId],confirmDeleteFiles:true});assert.ok(deleted.cleanup.removed.length);await assert.rejects(readFile(resourceFile),e=>e.code==='ENOENT');
 await assert.rejects(manager.execute({handleId:opened.handleId,action:'restore',expectedRevision:deleted.revision,historyId:prior.id}),/缺失/);
});
test('directory store rejects traversal and junctions outside the opened root',async()=>{
 const base=await mkdtemp(resolve('test-results/directory-manager/paths-')),outside=join(base,'outside'),root=join(base,'library');await mkdir(outside);await mkdir(root);await writeFile(join(outside,'sentinel.zip'),'unchanged');
 const store=new NodeLibraryStore(root);await assert.rejects(store.read('../outside/sentinel.zip'));
 await symlink(outside,join(root,'resources'),'junction');await assert.rejects(store.read('resources/sentinel.zip'),/symlink|junction/);assert.equal(await readFile(join(outside,'sentinel.zip'),'utf8'),'unchanged');
});
