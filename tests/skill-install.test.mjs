import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,stat,symlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {NativeDirectory} from './helpers/skill-directory.mjs';
import {installSkill,inspectSkill,installRoot,readInstallBytes} from '../web/skill-install.js';
import {validateSkillFiles,installFilePath,skillAgent,installPathLabel,skillDirectoryParts} from '../web/agent-install-paths.js';
const out=resolve('test-results/skill-install');await mkdir(out,{recursive:true});
const root=async()=>new NativeDirectory(await mkdtemp(join(out,'case-'))),folder='texture-forge-author';
const bundle=(more={})=>({folder,files:{'SKILL.md':'---\nname: texture-forge-author\ndescription: Test\n---\n中文 English\n','scripts/tool.mjs':'export const test = 1;\n',...more}});
test('agent destinations are documented, deterministic and project scoped',()=>{
 assert.equal(installPathLabel('codex'),'~/.agents/skills');assert.equal(installPathLabel('claude','Game'),'Game/.claude/skills');assert.equal(installPathLabel('cursor'),'~/.cursor/skills');assert.throws(()=>skillAgent('unknown'));
 for(const path of ['../x','/x','a\\b','C:/x','scripts/../x','a//b','con','a/NUL.txt','a.','a ','a\u0000b','.momo-overwrite'])assert.throws(()=>installFilePath(path));
 assert.throws(()=>validateSkillFiles(folder,{'SKILL.md':'---\nname: other\n---'}));assert.throws(()=>validateSkillFiles(folder,{...bundle().files,'skill.md':'duplicate'}));
});
test('native and browser-compatible writer installs files, detects exact versions and keeps unrelated data',async()=>{
 const r=await root(),skill=bundle();assert.equal((await inspectSkill(r,skill)).state,'missing');const first=await installSkill(r,skill,{agent:'codex'});assert.equal(first.state,'current');assert.ok(first.changed>0);
 assert.equal(await readFile(join(r.path,folder,'SKILL.md'),'utf8'),skill.files['SKILL.md']);assert.equal((await inspectSkill(r,skill)).state,'current');assert.equal((await installSkill(r,skill)).changed,0);
 await writeFile(join(r.path,folder,'my-notes.txt'),'keep me');await writeFile(join(r.path,folder,'SKILL.md'),'my edited skill');assert.equal((await inspectSkill(r,skill)).state,'modified');
 const updated=bundle({'README.md':'new guide'}),result=await installSkill(r,updated);assert.ok(result.backup);assert.equal(await readFile(join(r.path,result.backup,'SKILL.md.bak'),'utf8'),'my edited skill');assert.equal(await readFile(join(r.path,folder,'my-notes.txt'),'utf8'),'keep me');assert.equal((await inspectSkill(r,updated)).state,'current');
});
test('backup and rollback preserve exact bytes and remove only newly created files',async()=>{
 const r=await root(),dir=await r.getDirectoryHandle(folder,{create:true}),old=Uint8Array.from([255,254,0,128,65]);await writeFile(join(dir.path,'SKILL.md'),old);await writeFile(join(dir.path,'README.md'),'old readme');
 let failed=false;const wrap=d=>({getDirectoryHandle:async(...args)=>wrap(await d.getDirectoryHandle(...args)),removeEntry:name=>d.removeEntry(name),getFileHandle:async(name,...args)=>{const file=await d.getFileHandle(name,...args);return {...file,createWritable:async()=>{const stream=await file.createWritable();return {...stream,write:async data=>{if(name==='README.md'&&!failed){failed=true;throw Error('simulated disk failure');}await stream.write(data);}};}};}});
 const changed={folder,files:{'SKILL.md':bundle().files['SKILL.md'],'new.txt':'created','README.md':'new readme'}};
 await assert.rejects(installSkill(wrap(r),changed),/simulated disk failure/);assert.deepEqual(await readFile(join(dir.path,'SKILL.md')),Buffer.from(old));assert.equal(await readFile(join(dir.path,'README.md'),'utf8'),'old readme');await assert.rejects(stat(join(dir.path,'new.txt')),/ENOENT/);
});
test('project directories are created only during installation and links are not followed',async()=>{
 const r=await root();await assert.rejects(installRoot(r,'codex','project'),e=>e.name==='NotFoundError');const target=await installRoot(r,'codex','project',{create:true});assert.equal(target.path,join(r.path,'.agents','skills'));
 const external=await root();await symlink(external.path,join(target.path,folder),process.platform==='win32'?'junction':'dir');await assert.rejects(installSkill(target,bundle()),/link/);assert.deepEqual(await readInstallBytes(external,'SKILL.md'),null);
});
test('personal directory selection completes agent paths without nesting an existing skills directory',async()=>{
 for(const agent of ['codex','claude','cursor','agents']){
  const selected=await root(),parts=skillAgent(agent).parts;
  assert.deepEqual(skillDirectoryParts(agent,'personal',selected.name),parts);
  await assert.rejects(installRoot(selected,agent,'personal'),e=>e.name==='NotFoundError');
  const destination=await installRoot(selected,agent,'personal',{create:true});
  assert.equal(destination.path,join(selected.path,...parts));await installSkill(destination,bundle(),{agent});
  await assert.rejects(stat(join(selected.path,folder)),/ENOENT/);
  const agentDirectory=await selected.getDirectoryHandle(parts[0]);
  assert.equal((await installRoot(agentDirectory,agent,'personal',{create:true})).path,destination.path);
  assert.equal((await installRoot(destination,agent,'personal',{create:true})).path,destination.path);
  await assert.rejects(stat(join(destination.path,...parts)),/ENOENT/);
  assert.equal((await inspectSkill(await installRoot(destination,agent,'personal'),bundle())).state,'current');
  assert.equal((await installRoot(destination,agent,'project',{create:true})).path,join(destination.path,...parts));
 }
 assert.throws(()=>skillDirectoryParts('codex','unknown','skills'),/scope/);
});
