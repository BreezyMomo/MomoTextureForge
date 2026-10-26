import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AUTHORING_EXAMPLE,AUTHORING_GUIDE,AUTHORING_SKILL,parseAuthoring,assetFromAuthoring,authoringFromEditor,authoringPrompt,scalarHelpers} from '../web/ai-authoring.js';
import {builtinAsset,contentHash} from '../web/resource-assets.js';
import {CATALOG} from '../web/catalog.js';
import {encodeResourcePack,readResourcePack} from '../web/resource-pack.js';
import authoringRuntime from '../web/authoring-kit-runtime.js';
const example=()=>structuredClone(AUTHORING_EXAMPLE);
test('authoring accepts JSON/fence, binds variables and preserves portable source in pack',async()=>{
 const draft=parseAuthoring('```json\n'+JSON.stringify(example())+'\n```'),a=assetFromAuthoring(draft);assert.equal(a.definition.parameters[0].slot,0);assert.equal(a.definition.authoring.portable,true);const pack=await readResourcePack(await encodeResourcePack({schema:'momo.texture-assets/v1'},{assets:new Map([['example',a]])}));assert.equal(pack.prepared[0][1].definition.authoring.formula,draft.formula.source);assert.equal(await contentHash(a),await contentHash(pack.prepared[0][1]));pack.rollback();
});
test('authoring rejects malformed structures and parameter ranges without mutation',()=>{
 for(const mutate of [x=>x.schema='unknown',x=>x.formula.kind='javascript',x=>x.parameters[0].step=0,x=>x.parameters[0].default=999,x=>x.parameters[0].variable='time',x=>x.parameters[1].variable=x.parameters[0].variable,x=>x.formula.source='#include <x>',x=>x.helpers='#version 300 es',x=>x.parameters=Array(17).fill(x.parameters[0])]){const d=example();mutate(d);const copy=JSON.stringify(d);assert.throws(()=>parseAuthoring(d));assert.equal(JSON.stringify(d),copy);}assert.throws(()=>parseAuthoring('{bad'));assert.throws(()=>parseAuthoring('x'.repeat(2*1024*1024+1)));
});
test('all builtin scalar drafts retain helpers and export without IDs or slots',()=>{
 for(const p of CATALOG.filter(p=>!p.definition.generator)){const a=builtinAsset(p.id),d=a.definition,specs=d.parameters.map(s=>({...s,variable:s.variable??s.key})),draft=authoringFromEditor(a,{name:d.name,category:p.categoryName,description:''},d.authoring?.formula??d.outputs.scalar.inline,d.authoring?.kind??d.outputs.scalar.kind,specs,scalarHelpers(a));const parsed=parseAuthoring(draft);assert.equal(parsed.parameters.length,specs.length,p.id);assert.ok(!('slot' in (parsed.parameters[0]??{})));}
});
test('repair prompts include broken source/error/time without validation blocking copy',()=>{const d=example();d.formula.source='invalid';const p=authoringPrompt({draft:d,error:'undeclared identifier',time:2});assert.ok(p.includes('undeclared identifier'));assert.ok(p.includes('invalid'));assert.ok(p.includes('2'));});
test('distributed skill and reference files match shared contract',async()=>{
 const root=new URL('../skills/texture-forge-author/',import.meta.url);
 assert.equal((await readFile(new URL('SKILL.md',root),'utf8')).trim(),AUTHORING_SKILL.trim());
 assert.equal((await readFile(new URL('references/authoring-guide.md',root),'utf8')).trim(),AUTHORING_GUIDE.trim());
 for(const [name,text] of Object.entries(authoringRuntime))assert.ok(!text.includes('\r\n'),`${name} must use portable LF line endings`);
 for(const name of ['references/engine-integration.md','references/engine-integration.en.md']){
  const source=await readFile(new URL(name,root),'utf8');
  for(const checkout of [source.replace(/\r\n/g,'\n'),source.replace(/\r?\n/g,'\r\n')])assert.equal(authoringRuntime[name],checkout.replace(/\r\n/g,'\n'),name);
 }
});
