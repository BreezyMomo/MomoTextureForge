import {treeSamples} from '../web/tree-samples.js';
import {walk} from '../web/tree-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectMessages,validateUICatalogs} from '../tools/i18n-audit.mjs';
import {setLanguageOrder,parameterLabel} from '../web/language.js';
import {uiText,uiFormat,uiError,uiOption} from '../web/ui-language.js';
import {messageError,hasMessage} from '../web/message-catalog.js';
import {UI_CATALOGS} from '../web/locales/catalogs.js';
import {graphicLabel,categoryLabel} from '../web/graphic-label.js';
import {BY_ID,CATEGORIES} from '../web/catalog.js';
import englishHelp from '../web/locales/help-en.js';

test('every language has the same semantic message IDs, placeholders and declared UI bindings',async()=>{
 const report=await validateUICatalogs();assert.deepEqual(report.languages,['zh-CN','en']);assert.ok(report.referenced>1000);
 const missing=[...await collectMessages()].filter(([key])=>!Object.hasOwn(UI_CATALOGS.en,key));assert.deepEqual(missing,[]);
 assert.deepEqual(Object.entries(UI_CATALOGS.en).filter(([,value])=>/[\u3400-\u9fff]/.test(value)),[]);
 for(const builtin of BY_ID.values())if(!builtin.id.startsWith('asset_'))assert.ok(builtin.definition.aliases.en);
 for(const category of CATEGORIES)assert.ok(UI_CATALOGS.en['categories.'+category.id+'.name']);
 const source=await readFile(new URL('../web/ui-language.js',import.meta.url),'utf8');assert.ok(!source.includes('Object.keys(messages)'));assert.ok(source.includes('data-i18n'));
});

test('semantic UI keys format fixed text while preserving user names and resource metadata',()=>{
 try{
  setLanguageOrder(['en','zh-CN']);
  assert.equal(uiText('menu.file'),'File');assert.equal(uiText('constructor'),'constructor');assert.equal(uiText('文件'),'文件');
  assert.equal(uiFormat('workspace.layerValueValue',1,'颜色'),'Layer 1 · 颜色');
  assert.equal(uiError(messageError('errors.invalidLanguageTag','用户名')),'Invalid language tag: 用户名');
  assert.equal(uiError(Error('用户自己输入的错误')),'用户自己输入的错误');
  assert.equal(uiOption('common.close'),'Off');assert.equal(uiText('common.close'),'Close');
  const builtin=BY_ID.get('Circle'),before=JSON.stringify(builtin);assert.equal(graphicLabel(builtin),'Circle');assert.equal(JSON.stringify(builtin),before);
  assert.equal(graphicLabel({id:'asset_custom',zh:'颜色'}),'颜色');assert.equal(graphicLabel({id:'asset_named_like_key',zh:'menu.file'}),'menu.file');assert.equal(parameterLabel({variable:'radius',aliases:{en:'menu.file'}}),'menu.file');assert.equal(categoryLabel(0),'Basic shapes');
  setLanguageOrder(['zh-CN']);assert.equal(uiText('menu.file'),'文件');assert.equal(graphicLabel(builtin),builtin.zh);
 }finally{setLanguageOrder(['zh-CN','en']);}
});

test('editing Chinese wording does not change its key or English translation; missing text uses configured fallback',()=>{
 const chinese=UI_CATALOGS['zh-CN']['menu.file'],english=UI_CATALOGS.en['menu.file'];
 try{
  UI_CATALOGS['zh-CN']['menu.file']='文件菜单';setLanguageOrder(['en']);assert.equal(uiText('menu.file'),'File');
  delete UI_CATALOGS.en['menu.file'];assert.equal(uiText('menu.file'),'文件菜单');
  setLanguageOrder(['zh-CN']);assert.equal(uiText('menu.file'),'文件菜单');assert.equal(uiText('unknown.missingMessage'),'unknown.missingMessage');
 }finally{UI_CATALOGS['zh-CN']['menu.file']=chinese;UI_CATALOGS.en['menu.file']=english;setLanguageOrder(['zh-CN']);}
});

test('English help covers every bundled manual topic',()=>{
 assert.deepEqual(Object.keys(englishHelp).sort(),['workspace','layout','animation','image','recipes'].sort());
 for(const body of Object.values(englishHelp)){assert.ok(body.startsWith('# '));assert.ok(body.length>1000);assert.ok(!/[\u3400-\u9fff]/.test(body));}
});

test('example descriptors use message IDs while their editable canvas nodes retain names',()=>{
 for(const sample of treeSamples()){
  assert.ok(hasMessage(sample.nameKey),sample.name);assert.ok(hasMessage(sample.description));for(const tag of sample.tags)assert.ok(hasMessage(tag),tag);
  walk(sample.root,node=>assert.ok(!hasMessage(node.name),'Canvas names must remain authored text: '+node.name));
 }
});
