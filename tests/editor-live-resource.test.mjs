import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLiveResource} from '../web/editor-live-resource.js';
import {readResourcePack} from '../web/resource-pack.js';
import {CATALOG,BY_ID} from '../web/catalog.js';
import {builtinAsset} from '../web/resource-assets.js';
import {node} from '../web/tree-model.js';

test('preview-only validates/packages without saving; native generator defaults retain generator identity',async()=>{
 const graphic=CATALOG.find(g=>g.definition.generator&&g.parameters.some(p=>p.variable)),asset=builtinAsset(graphic.id),parameter=asset.definition.parameters.find(p=>p.variable),revision='a'.repeat(64),count=CATALOG.length;let saved;
 const library=async op=>op==='library-detail'?{revision,item:{name:graphic.definition.name,source:'builtin',kind:'generator'},source:{root:node('shape',graphic.id),assets:[{id:graphic.id,asset}]}}:{revision};
 const create=createLiveResource({library,render:root=>{const d=BY_ID.get(root.type).definition;assert.deepEqual(d.generator,asset.definition.generator);assert.equal(d.defaults[parameter.slot],parameter.min);return 'preview';},save:async(entry,bytes)=>{saved={entry,bytes};return entry;}});
 const args={editKey:'builtin',expectedLibraryRevision:revision,defaults:{[parameter.variable]:parameter.min},metadata:{name:'Generator copy',category:'Fixtures',description:'Native generator'}};
 const preview=await create({...args,previewOnly:true});assert.equal(preview.applied,false);assert.equal(saved,undefined);assert.equal(CATALOG.length,count);
 const result=await create(args);assert.equal(result.entry.generator,true);assert.equal(result.entry.kind,'formula');assert.equal(result.entry.name,'Generator copy');assert.equal(CATALOG.length,count);
 const pack=await readResourcePack(saved.bytes);try{const copied=pack.prepared[0][1];assert.deepEqual(copied.definition.generator,asset.definition.generator);assert.equal(copied.definition.parameters.find(p=>p.variable===parameter.variable).default,parameter.min);}finally{pack.rollback();}
 await assert.rejects(create({...args,defaults:{missing:0}}),/Invalid default/);
 const data=(await readFile('skills/texture-forge-author/references/example.graphic.json')).toString('base64');let writes=0;
 const draft=createLiveResource({library:async()=>({revision}),render:()=>'',save:async()=>{writes++;}});await draft({data,mime:'application/json',expectedLibraryRevision:revision,previewOnly:true});assert.equal(writes,0);assert.equal(CATALOG.length,count);
});

test('resource creation validates, renders and packages formula/generator before saving a new original',async()=>{
 for(const file of ['example.graphic.json','example.generator.json']){
  const source=await readFile('skills/texture-forge-author/references/'+file),revision='a'.repeat(64),start=CATALOG.length;let saved,rendered=false;
  const create=createLiveResource({library:async()=>({revision}),render:root=>{assert.ok(BY_ID.has(root.type));rendered=true;return '';},save:async(entry,bytes)=>{assert.ok(rendered);saved={entry,bytes};return entry;}});
  const result=await create({mime:'application/json',name:file,data:source.toString('base64'),expectedLibraryRevision:revision});
  assert.equal(result.applied,true);assert.equal(CATALOG.length,start);assert.ok(result.key.startsWith('local:'));assert.equal(saved.entry.name,JSON.parse(source).name);
  const pack=await readResourcePack(saved.bytes);try{assert.equal(pack.payload.graphicResource.resourceId,saved.entry.resourceId);assert.equal(pack.prepared.length,1);assert.equal(!!pack.prepared[0][1].definition.generator,file==='example.generator.json');}finally{pack.rollback();}
 }
});

test('resource compile errors, library conflicts and expired requests never save or leave registered assets',async()=>{
 const data=(await readFile('skills/texture-forge-author/references/example.graphic.json')).toString('base64'),initial='a'.repeat(64),args={mime:'application/json',data,expectedLibraryRevision:initial},start=CATALOG.length;
 for(const scenario of ['compile','conflict','expired']){
  let revision=initial,active=true,saved=false;
  const create=createLiveResource({library:async()=>({revision}),render:()=>{if(scenario==='compile')throw Error('compile failure');if(scenario==='conflict')revision='b'.repeat(64);if(scenario==='expired')active=false;return '';},save:async()=>{saved=true;}});
  await assert.rejects(create(args,()=>active));assert.equal(saved,false);assert.equal(CATALOG.length,start);
 }
});


test('local updates preserve identity, increment version and pass atomic storage guards',async()=>{
 const data=(await readFile('skills/texture-forge-author/references/example.graphic.json')).toString('base64'),revision='a'.repeat(64),previous={source:'local',resourceId:crypto.randomUUID(),versionId:3,hash:'b'.repeat(64),aliases:{fr:'Original'}};
 let saved;
 const create=createLiveResource({library:async op=>op==='library-detail'?{revision,item:previous}:{revision},render:()=>'',save:async(entry,bytes,options)=>{saved={entry,options};return entry;}});
 await create({mime:'application/json',data,expectedLibraryRevision:revision,updateKey:'local:old'});
 assert.equal(saved.entry.resourceId,previous.resourceId);assert.equal(saved.entry.versionId,4);assert.deepEqual(saved.options,{update:true,expectedLocal:{versionId:3,hash:previous.hash}});
 for(const source of ['builtin','remote']){previous.source=source;saved=null;await assert.rejects(create({mime:'application/json',data,expectedLibraryRevision:revision,updateKey:'old'}),/Only local/);assert.equal(saved,null);}
});

test('saving nodes and whole canvas to library leaves project untouched and rejects stale edits',async()=>{
 const {project}=await import('../web/tree-model.js'),{editorRevision}=await import('../web/editor-live-authoring.js');
 let p=project(),revision='a'.repeat(64),saved,mutate=false;
 const before=JSON.stringify(p),expectedRevision=await editorRevision(before);
 const create=createLiveResource({library:async()=>({revision}),getProject:()=>p,revision:editorRevision,render:()=>{if(mutate)p.name='Concurrent edit';return '';},save:async(entry,bytes)=>{saved={entry,bytes};return entry;}});
 const args={fromNode:true,nodeId:'@root',resourceName:'Canvas copy',expectedRevision,expectedLibraryRevision:revision};
 const first=await create(args),second=await create(args);assert.notEqual(first.entry.resourceId,second.entry.resourceId);assert.equal(saved.entry.kind,'composition');assert.equal(JSON.stringify(p),before);
 const pack=await readResourcePack(saved.bytes);try{assert.equal(pack.payload.root.children.length,p.root.children.length);assert.equal(pack.payload.graphicResource.name,'Canvas copy');}finally{pack.rollback();}
 saved=null;await assert.rejects(create({...args,expectedRevision:'f'.repeat(64)}),/Canvas changed/);assert.equal(saved,null);
 await assert.rejects(create({...args,nodeId:'missing'}),/Unknown source/);assert.equal(saved,null);
 mutate=true;await assert.rejects(create(args),/Canvas changed/);assert.equal(saved,null);
});


test('image processing rejects non-images and invalid native settings before saving',async()=>{
 const revision='a'.repeat(64);let saved=false,asset={kind:'formula'};
 const create=createLiveResource({library:async operation=>operation==='library-detail'?{revision,item:{source:'local'},source:{root:{type:'image'},assets:[{id:'image',asset}]}}:{revision},render:()=>'',save:async()=>{saved=true;}});
 await assert.rejects(create({imageKey:'image',expectedLibraryRevision:revision}),/image/);
 asset={kind:'image',mime:'image/svg+xml'};await assert.rejects(create({imageKey:'image',expectedLibraryRevision:revision,processing:{autoCenter:true}}),/SVG/);await assert.rejects(create({imageKey:'image',expectedLibraryRevision:revision,trace:{}}),/SVG/);
 asset={kind:'image',mime:'image/png'};
 for(const options of [{processing:{tolerance:2}},{transform:{scale:0}},{color:{mode:'invalid'}}])await assert.rejects(create({imageKey:'image',expectedLibraryRevision:revision,...options}));
 assert.equal(saved,false);
});
