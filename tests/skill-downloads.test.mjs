import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {skillPackage} from '../web/skill-downloads.js';
import {decodeZIP} from '../web/resource-zip.js';
const text=bytes=>new TextDecoder().decode(bytes);
const normalized=value=>value.replace(/\r\n?/g,'\n');
test('both downloadable skills have their own entrypoint and all reference links resolve',async()=>{
 for(const [kind,folder] of [['author','texture-forge-author'],['effects','texture-forge-effects']]){
  const pack=await skillPackage(kind),files=await decodeZIP(pack.bytes),entry=text(files.get(folder+'/SKILL.md'));
  assert.ok(entry.includes('name: '+folder));
  assert.ok(files.has(folder+'/SKILL.en.md'),'English Skill entry is bundled');
  assert.ok(text(files.get(folder+'/SKILL.en.md')).includes('name: '+folder));
  for(const [name,bytes]of files)if(name.endsWith('.md'))for(const match of text(bytes).matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){
   const path=match[1];if(/^[a-z]+:/i.test(path))continue;
   const relative=new URL(path,'https://skill.local/'+name).pathname.slice(1);assert.ok(files.has(relative),name+' -> '+path);
  }
  if(kind==='author')assert.ok(files.has(folder+'/scripts/texforge.mjs'));
  else assert.ok([...files.keys()].every(name=>name.endsWith('.md')));
 }
 await assert.rejects(()=>skillPackage('unknown'),/未知Skill/);
});
test('both Skill downloads match maintained bilingual instructions and effects use dynamic catalog context',async()=>{
 for(const kind of ['author','effects']){
  const files=await decodeZIP((await skillPackage(kind)).bytes);
  for(const [name,bytes]of files)if(name.endsWith('.md'))assert.equal(normalized(text(bytes)).trimEnd(),normalized(await readFile(new URL('../skills/'+name,import.meta.url),'utf8')).trimEnd(),name);
  if(kind==='effects'){
   assert.ok(!files.has('texture-forge-effects/references/patterns.md'));
   assert.ok(files.has('texture-forge-effects/references/ai-context.md'));
  }
 }
});

test('generated parameter guidance contains display labels rather than internal message IDs',async()=>{
 const text=await readFile(new URL('../skills/texture-forge-effects/references/layout-parameters.md',import.meta.url),'utf8');
 assert.ok(text.includes('网格列数'));assert.ok(!/\b(?:editor|ui|arrangement)\.[A-Za-z]/.test(text));
});
