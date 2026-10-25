import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleCatalog,exampleProject,projectShareLink} from '../web/project-examples.js';
import {project,node} from '../web/tree-model.js';
import {createLiveAuthoring,editorRevision} from '../web/editor-live-authoring.js';
import {treeSamples} from '../web/tree-samples.js';

test('example preview frames fit the normalized editor timeline',()=>{
 for(const sample of treeSamples())if(sample.previewTime!==undefined){
  assert.ok(Number.isFinite(sample.previewTime)&&sample.previewTime>=0&&sample.previewTime<=1,sample.name+' previewTime must be normalized progress');
 }
});

test('native examples have stable unique IDs and editable independent project trees',()=>{
 const catalog=exampleCatalog();assert.ok(catalog.length>10);assert.equal(new Set(catalog.map(e=>e.id)).size,catalog.length);
 for(const e of catalog){const p=exampleProject(e.id);assert.equal(p.name,e.name);assert.ok(p.root.children.length);assert.notEqual(exampleProject(e.id).root.children[0].id,p.root.children[0].id);}
 assert.throws(()=>exampleProject('missing'),/Unknown example/);
});
test('share links round trip Unicode and refuse missing resources, file URLs and oversized data',()=>{
 const p=project();p.name='作品 🎨 asset_in_name';p.root.children=[node('shape','Circle')];
 const result=projectShareLink(p,'https://example.test/editor/?private=remove#old');assert.equal(result.available,true);
 assert.deepEqual(JSON.parse(Buffer.from(result.url.split('#tree=')[1],'base64').toString()),p);assert.ok(!result.url.includes('private'));
 assert.equal(projectShareLink(p,'file:///C:/editor.html').reason,'file-page');
 p.root.children[0].type='asset_custom';assert.equal(projectShareLink(p,'https://example.test/').reason,'custom-dependencies');
 p.root.children[0].type='Circle';p.name='a'.repeat(100001);assert.equal(projectShareLink(p,'https://example.test/').reason,'size-limit');
});
test('live example replacement and sharing require current revision; invalid input never commits',async()=>{
 let state=project(),commits=0;const run=createLiveAuthoring({getProject:()=>state,getPageURL:()=> 'https://example.test/',commitProject:p=>{state=p;commits++;}});
 const expectedRevision=await editorRevision(JSON.stringify(state)),examples=await run('examples'),id=examples.examples[0].id;
 assert.equal((await run('project-share',{expectedRevision})).available,true);assert.equal(commits,0);
 await assert.rejects(run('example-open',{expectedRevision,id:'unknown'}),/Unknown example/);assert.equal(commits,0);
 await assert.rejects(run('example-open',{expectedRevision,id},()=>false));assert.equal(commits,0);
 const opened=await run('example-open',{expectedRevision,id});assert.equal(commits,1);assert.equal(opened.editRevision,await editorRevision(JSON.stringify(state)));
 await assert.rejects(run('example-open',{expectedRevision,id}));await assert.rejects(run('project-share',{expectedRevision}));assert.equal(commits,1);
});
