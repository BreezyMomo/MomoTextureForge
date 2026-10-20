import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BUILTIN} from '../web/definition-runtime.js';
import thumbnails from '../web/builtin-thumbnails.js';
const root=new URL('../',import.meta.url);
const json=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const plan=await json('docs/builtin-implementation.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('catalog contains all current graph bodies and matching thumbnails',async()=>{
 const included=plan.patterns.filter(p=>p.status!=='external').map(p=>p.id).sort();
 assert.equal(included.length,284);
 assert.deepEqual(BUILTIN.catalog.map(p=>p.id).sort(),included);
 assert.deepEqual((await readdir(new URL('web/definitions/patterns/',root))).sort(),included);
 assert.deepEqual(Object.keys(thumbnails).sort(),included);
 for(const p of plan.patterns){
  if(p.status==='external')continue;
  if(p.status==='retained-original')assert.equal(p.sha256,p.previousSha256,p.id+' must retain its reviewed original formula');
  else {assert.equal(p.status,'modified');assert.ok(p.reason,p.id+' requires an implementation change reason');}
  assert.equal(sha(await readFile(new URL('web/definitions/patterns/'+p.id+'/formula.glsl',root))),p.sha256,p.id);
 }
});

test('all five shared libraries retain their reviewed bytes and pattern versions match the current manifest',async()=>{
 assert.equal(Object.keys(plan.sharedLibraries).length,5);
 for(const [id,entry] of Object.entries(plan.sharedLibraries))assert.equal(sha(await readFile(new URL('web/definitions/libraries/'+id+'.glsl',root))),entry.sha256,id);
 for(const p of BUILTIN.catalog)assert.equal(p.definition.revision,plan.patterns.find(r=>r.id===p.id).revision??1,p.id);
});

test('portable authoring bundle contains all current formula files',async()=>{
 const {default:runtime}=await import('../web/authoring-kit-runtime.js');
 const cli=runtime['scripts/texforge.mjs'];
 for(const p of plan.patterns)assert.ok(cli.includes('patterns/'+p.id+'/formula.glsl'),p.id);
});
