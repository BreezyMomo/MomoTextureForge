import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeParameter,normalizeAliases,resolveAlias,validVariable,parameterRole} from '../web/parameter-metadata.js';
import {setLanguageOrder,setLanguage,languageOrder,parameterLabel,onLanguageChange,SUPPORTED_LANGUAGES,languageOrderFor} from '../web/language.js';
import {BUILTIN} from '../web/definition-runtime.js';
import {builtinAsset,contentHash,validateAsset} from '../web/resource-assets.js';
import {parseAuthoring,assetFromAuthoring,authoringFromEditor,AUTHORING_EXAMPLE} from '../web/ai-authoring.js';
import {parseGeneratorAuthoring,assetFromGeneratorAuthoring,generatorAuthoringFromAsset,GENERATOR_EXAMPLE} from '../web/generator-authoring.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import {node,project,shapeDefaults,fieldSpec} from '../web/tree-model.js';
import {validateLibrary} from '../web/definition-schema.js';

test('alias resolution obeys the complete explicit order and falls back only to variable',()=>{
 const p={variable:'radius',label:'旧名称',aliases:{'zh-CN':'半径',en:'Radius',ja:'半径（日本語）'}};
 assert.equal(resolveAlias(p,['fr','en','zh-CN']),'Radius');
 assert.equal(resolveAlias(p,['fr','ja','zh-CN']),'半径（日本語）');
 assert.equal(resolveAlias(p,['fr']),'radius');assert.equal(resolveAlias({...p,aliases:{en:'  '}},['en']),'radius');
 assert.equal(resolveAlias({variable:'_radius',aliases:{}},['zh-CN']),'_radius');
 assert.equal(resolveAlias({key:'R',label:'半径'},['en','zh-CN']),'半径');
 assert.equal(resolveAlias({variable:'radius',aliases:{'en-us':'Radius'}},['en-US']),'Radius');
});
test('metadata accepts aliases-only and no-alias parameters; validates identifiers and language maps',()=>{
 assert.equal(normalizeParameter({variable:'_size'}).label,'_size');
 for(const variable of ['time','u','uv','return','gl_param','foo__bar','3size','bad-name','中文','vec2','sampler2D','isampler2DMSArray','samplerCubeArrayShadow','uimage2D','imageCubeArray','input0'])assert.equal(validVariable(variable),false,variable);
 for(const variable of ['radius','_size','R','seed','width2','imageMode','samplerCount'])assert.equal(validVariable(variable),true,variable);
 for(const aliases of [[],null,{'en_US':'x'},{en:7},{en:'x','EN':'y'},{en:'x'.repeat(129)}])assert.throws(()=>normalizeAliases(aliases));
 assert.deepEqual(normalizeAliases({'zh-cn':' 半径 ',en:''}),{'zh-CN':'半径',en:''});
 assert.throws(()=>normalizeParameter({label:'参数'}));
});
test('all builtin bindings are unique and bilingual; feather behavior does not depend on aliases',()=>{
 for(const p of BUILTIN.catalog){assert.equal(new Set(p.parameters.map(s=>s.variable)).size,p.parameters.length,p.id);for(const spec of p.parameters){assert.ok(validVariable(spec.variable),p.id);assert.ok(spec.aliases.en,p.id);assert.ok(spec.aliases['zh-CN'],p.id);}}
 const feather=BUILTIN.catalog[0].parameters.find(s=>s.role==='feather');
 assert.equal(parameterRole({...feather,label:'renamed',aliases:{en:'Edge blend'}}),'feather');
 assert.equal(shapeDefaults('Circle')[feather.slot],0);assert.equal(fieldSpec(node('shape','Circle'),'params.'+feather.slot)[0],0);
});
test('language changes do not mutate resources, project serialization, tracks or hashes',async()=>{
 const p=project();p.root.children=[node('shape','Circle')];p.root.children[0].name='我的半径';p.root.children[0].tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,.2],[1,.8]]};
 const before=JSON.stringify(p),asset=builtinAsset('Circle'),hash=await contentHash(asset),events=[];
 const unsubscribe=onLanguageChange(order=>events.push(order));
 try{setLanguageOrder(['en','zh-CN']);assert.equal(parameterLabel(asset.definition.parameters[0]),'Radius');assert.throws(()=>setLanguage('ja'));assert.deepEqual(languageOrder(),['en','zh-CN']);setLanguage('zh-CN');assert.equal(parameterLabel({variable:'radius',aliases:{ja:'半径'}}),'radius');assert.equal(JSON.stringify(p),before);assert.equal(await contentHash(asset),hash);assert.equal(events.length,2);assert.throws(()=>setLanguageOrder(['en','EN']));assert.deepEqual(languageOrder(),['zh-CN','en']);}finally{unsubscribe();setLanguageOrder(['zh-CN','en']);}
});
test('formula and generator authoring preserve aliases and options across export/import and ZIP',async()=>{
 const source=structuredClone(AUTHORING_EXAMPLE);delete source.parameters[0].label;source.parameters[0].aliases={en:'Base radius',ja:'基準半径'};
 source.parameters[1].aliases={};
 const draft=parseAuthoring(source),asset=assetFromAuthoring(draft);
 const exported=authoringFromEditor(asset,{name:draft.name,category:draft.category,description:draft.description},draft.formula.source,draft.formula.kind,asset.definition.parameters,draft.helpers);
 assert.deepEqual(parseAuthoring(exported).parameters[0].aliases,source.parameters[0].aliases);assert.deepEqual(exported.parameters[1].aliases,{});
 const generator=structuredClone(GENERATOR_EXAMPLE);generator.parameters[0].aliases={en:'Seed'};delete generator.parameters[0].label;
 generator.parameters[1]={...generator.parameters[1],type:'select',min:0,max:2,step:1,default:1,aliases:{en:'Size mode'},options:[{value:0,variable:'small',aliases:{en:'Small',ja:'小'}},{value:1,variable:'medium',aliases:{}},{value:2,variable:'large',aliases:{'zh-CN':'大'}}]};
 const g=parseGeneratorAuthoring(generator),ga=assetFromGeneratorAuthoring(g);assert.deepEqual(generatorAuthoringFromAsset(ga,{name:g.name,category:g.category,description:g.description}),g);
 for(const a of [asset,ga]){const pack=await readResourcePack(await encodeResourcePack({schema:'momo.texture-assets/v1'},{assets:new Map([['custom',a]])}));try{assert.deepEqual(pack.prepared[0][1],a);}finally{pack.rollback();}}
});
test('old label-only resources stay readable and duplicate variable/option names are rejected',()=>{
 const old=builtinAsset('Circle');for(const p of old.definition.parameters){delete p.variable;delete p.aliases;delete p.role;}assert.doesNotThrow(()=>validateAsset(old));
 const source=structuredClone(AUTHORING_EXAMPLE);source.parameters[1].variable=source.parameters[0].variable;assert.throws(()=>parseAuthoring(source));
 const p=builtinAsset('PuzzlePiece');p.definition.parameters[0].options[1].variable=p.definition.parameters[0].options[0].variable;assert.throws(()=>validateAsset(p),/选项变量名重复/);
 const definition=structuredClone(BUILTIN.definition);delete definition.patterns[0].parameters[0].variable;assert.throws(()=>validateLibrary(definition),/变量名/);
});


test('language choices and automatic fallback are fixed by the build configuration',async()=>{
 assert.deepEqual(SUPPORTED_LANGUAGES,[{code:'zh-CN',name:'简体中文'},{code:'en',name:'English'}]);
 assert.deepEqual(languageOrderFor('en'),['en','zh-CN']);assert.deepEqual(languageOrderFor('zh-CN'),['zh-CN','en']);
 for(const code of ['fr','en-US','garbage',''])assert.throws(()=>setLanguage(code));
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(['ja','en'])}});
  const restored=await import('../web/language.js?legacy-language-test');assert.deepEqual(restored.languageOrder(),['en','zh-CN']);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(['ja'])}});
  const fallback=await import('../web/language.js?unknown-language-test');assert.deepEqual(fallback.languageOrder(),['zh-CN','en']);
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
