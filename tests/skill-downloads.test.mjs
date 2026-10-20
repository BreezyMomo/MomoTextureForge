import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {skillPackage} from '../web/skill-downloads.js';
import {decodeZIP} from '../web/resource-zip.js';
const text=bytes=>new TextDecoder().decode(bytes);
const normalized=value=>value.replace(/\r\n?/g,'\n');
test('both downloadable skills have their own entrypoint and all reference links resolve',async()=>{
 for(const [kind,folder] of [['author','texture-forge-author'],['effects','texture-forge-effects']]){
  const pack=skillPackage(kind),files=await decodeZIP(pack.bytes),entry=text(files.get(folder+'/SKILL.md'));
  assert.ok(entry.includes('name: '+folder));
  for(const [name,bytes]of files)if(name.endsWith('.md'))for(const match of text(bytes).matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){
   const path=match[1];if(/^[a-z]+:/i.test(path))continue;
   const relative=new URL(path,'https://skill.local/'+name).pathname.slice(1);assert.ok(files.has(relative),name+' -> '+path);
  }
  if(kind==='author')assert.ok(files.has(folder+'/scripts/texforge.mjs'));
  else assert.ok([...files.keys()].every(name=>name.endsWith('.md')));
 }
 assert.throws(()=>skillPackage('unknown'),/未知Skill/);
});
test('effects download matches maintained references and uses dynamic context instead of a fixed catalog',async()=>{
 const files=await decodeZIP(skillPackage('effects').bytes),prefix='texture-forge-effects/';
 for(const [name,bytes]of files)assert.equal(normalized(text(bytes)),normalized(await readFile(new URL('../skills/'+name,import.meta.url),'utf8')),name);
 assert.ok(!files.has(prefix+'references/patterns.md'));
 assert.ok(files.has(prefix+'references/ai-context.md'));
});
