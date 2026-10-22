import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGraphicAliases,graphicAliasesField,resolveGraphicName,graphicSearchText} from '../web/graphic-name.js';
import {graphicLabel} from '../web/graphic-label.js';
import {setLanguage} from '../web/language.js';
import {CATALOG} from '../web/catalog.js';
import {builtinAsset,contentHash,validateAsset} from '../web/resource-assets.js';
import {AUTHORING_EXAMPLE,parseAuthoring,assetFromAuthoring,authoringFromEditor} from '../web/ai-authoring.js';
import {GENERATOR_EXAMPLE,parseGeneratorAuthoring,assetFromGeneratorAuthoring,generatorAuthoringFromAsset} from '../web/generator-authoring.js';
import {encodeResourcePack,readResourcePack,imageAsset} from '../web/resource-pack.js';
import {validateEntry} from '../web/graphics-library.js';
import {exportGraphicsLibrary} from '../web/graphics-export.js';
import {buildRemoteLibrary} from '../remote-library-publisher.mjs';
import {validateRemoteIndex} from '../web/remote-library-model.js';
import {stageResourceFiles} from '../web/resource-import.js';
import {createProjectResource,renameProjectResource,publishedProjectResource} from '../web/project-resources.js';
import {project,node,sanitizeTree,PRESET_SCHEMA} from '../web/tree-model.js';
import {serializeGraphicList,restoreGraphicList} from '../web/persistent-graphic-list.js';
const aliases={'zh-CN':'冰霜护盾',en:'Frost Shield',ja:'氷の盾'},name='默认护盾';
const meta=()=>({resourceId:crypto.randomUUID(),versionId:1,personalRevision:0,name,aliases:structuredClone(aliases),kind:'formula',category:'测试',description:''});

test('resource names resolve selected language, configured fallbacks, default name, then ID without translation by UI key',()=>{
 const value={id:'FrostShield',name,aliases};assert.equal(resolveGraphicName(value,['en','zh-CN']),'Frost Shield');assert.equal(resolveGraphicName(value,['de','zh-CN','en']),'冰霜护盾');assert.equal(resolveGraphicName({...value,aliases:{en:' '}},['en']),name);assert.equal(resolveGraphicName({id:'OnlyId'},['en']),'OnlyId');assert.equal(resolveGraphicName({name:'menu.file'},['en']),'menu.file');
 assert.deepEqual(normalizeGraphicAliases({'EN':' Shield ',ja:'氷の盾'}),{en:'Shield',ja:'氷の盾'});assert.equal(resolveGraphicName({name,aliases:{EN:' Shield '}},['en']),'Shield');
 for(const query of ['frost shield','冰霜护盾','氷の盾','frostshield',name])assert.ok(graphicSearchText(value).includes(query.toLocaleLowerCase()));
});

test('all bundled graphic names belong to definitions and switching language leaves resources and node names unchanged',async()=>{
 for(const pattern of CATALOG.filter(p=>!p.id.startsWith('asset_'))){assert.equal(pattern.definition.aliases['zh-CN'],pattern.definition.name);assert.ok(pattern.definition.aliases.en);normalizeGraphicAliases(pattern.definition.aliases);}
 const resource=builtinAsset('Circle'),hash=await contentHash(resource),p=project();p.root.children[0].name='用户节点';const saved=JSON.stringify(p);
 try{setLanguage('en');assert.equal(graphicLabel({definition:resource.definition}),'Circle');setLanguage('zh-CN');assert.equal(graphicLabel({definition:resource.definition}),'圆形');assert.equal(await contentHash(resource),hash);assert.equal(JSON.stringify(p),saved);}finally{setLanguage('zh-CN');}
});

test('formula and generator authoring preserve optional names, inactive aliases and default-only legacy resources',async()=>{
 const draft=parseAuthoring({...structuredClone(AUTHORING_EXAMPLE),name,aliases}),asset=assetFromAuthoring(draft);assert.deepEqual(asset.definition.aliases,aliases);
 const exported=authoringFromEditor(asset,{name},draft.formula.source,draft.formula.kind,asset.definition.parameters,draft.helpers);assert.deepEqual(parseAuthoring(exported).aliases,aliases);
 const generator=parseGeneratorAuthoring({...structuredClone(GENERATOR_EXAMPLE),name,aliases}),generated=assetFromGeneratorAuthoring(generator);assert.deepEqual(generated.definition.aliases,aliases);assert.deepEqual(generatorAuthoringFromAsset(generated).aliases,aliases);
 const old=parseAuthoring({...structuredClone(AUTHORING_EXAMPLE),name});assert.equal(old.aliases,undefined);assert.equal(assetFromAuthoring(old).definition.aliases,undefined);
 const oldGenerator=parseGeneratorAuthoring({...structuredClone(GENERATOR_EXAMPLE),name});assert.equal(assetFromGeneratorAuthoring(oldGenerator).definition.aliases,undefined);
 const image=await imageAsset(new File([Uint8Array.of(1,2,3)],'用户图片.png',{type:'image/png'}));assert.equal(image.definition.aliases,undefined);assert.equal(image.definition.name,'用户图片');
});

test('name aliases are validated on every authored, asset and resource metadata boundary',()=>{
 for(const bad of [null,[],{en:4},{en:'x'.repeat(81)},{'not_language':'Name'},{en:'A',EN:'B'}]){assert.throws(()=>normalizeGraphicAliases(bad));assert.throws(()=>parseAuthoring({...structuredClone(AUTHORING_EXAMPLE),aliases:bad}));assert.throws(()=>parseGeneratorAuthoring({...structuredClone(GENERATOR_EXAMPLE),aliases:bad}));assert.throws(()=>validateEntry({...meta(),aliases:bad}));const asset=builtinAsset('Circle');asset.definition.aliases=bad;assert.throws(()=>validateAsset(asset));}
 assert.deepEqual(graphicAliasesField(undefined),{});assert.deepEqual(normalizeGraphicAliases({en:''}),{en:''});
});

test('resource ZIP, library export, static publishing, directory reading and staged reimport retain name aliases',async()=>{
 const record=meta(),draft=parseAuthoring({...structuredClone(AUTHORING_EXAMPLE),name,aliases}),asset=assetFromAuthoring(draft),root={...node(),type:'PortableShield'},bytes=await encodeResourcePack({schema:PRESET_SCHEMA,name,root,graphicResource:record},{assets:[['PortableShield',asset]]});
 const pack=await readResourcePack(bytes);assert.deepEqual(pack.payload.graphicResource.aliases,aliases);assert.deepEqual(pack.prepared[0][1].definition.aliases,aliases);pack.rollback();
 const exported=await exportGraphicsLibrary([record],async()=>bytes),published=await buildRemoteLibrary([exported]);assert.deepEqual(published.index.entries[0].aliases,aliases);assert.deepEqual(validateRemoteIndex(published.index,'https://example.test/index.json').entries[0].aliases,aliases);
 const staged=await stageResourceFiles([new File([exported],'library.zip')],()=> '');assert.equal(staged.length,1);assert.deepEqual(staged[0].meta.aliases,aliases);const reimported=await readResourcePack(staged[0].bytes);assert.deepEqual(reimported.payload.graphicResource.aliases,aliases);reimported.rollback();
});

test('shelf serialization, alias-only renaming and publishing retain metadata independently of existing canvas instances',()=>{
 const resource=createProjectResource(node(),meta()),p=project();p.projectResources=[resource];assert.deepEqual(sanitizeTree(p).projectResources[0].aliases,aliases);assert.deepEqual(restoreGraphicList(serializeGraphicList([resource]))[0].aliases,aliases);
 const copy=structuredClone(resource.root),renamed=renameProjectResource(resource,{name,aliases:{en:'New Shield'}});assert.equal(renamed.personalRevision,1);assert.deepEqual(renamed.aliases,{en:'New Shield'});assert.deepEqual(copy,resource.root);assert.equal(renameProjectResource(renamed,{name,aliases:{en:'New Shield'}}),renamed);
 const published=publishedProjectResource(renamed,{...meta(),resourceId:resource.resourceId,versionId:2});assert.deepEqual(published.aliases,aliases);assert.equal(published.personalRevision,0);
});
