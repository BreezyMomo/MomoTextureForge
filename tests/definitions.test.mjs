import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import { BUILTIN } from "../web/definition-runtime.js";
import { loadDefinitions, loadDefinitionURL } from "../web/definition-loader.js";
import { validateLibrary, validateIndex } from "../web/definition-schema.js";
import { patternFunction, extraFormulaLibraries } from "../web/definition-compiler.js";
import { pruneGLSL } from "../web/renderer.js";
const clone = () => structuredClone(BUILTIN.definition);
const read = file => BUILTIN.sources[file];
const readResource = file => readFile(new URL(`../web/definitions/${file}`,import.meta.url),'utf8');

test("per-pattern index loads 298 independent configs, resolves local sources and bounds concurrent IO", async () => {
  const calls=new Map();let active=0,maximum=0;
  const registry=await loadDefinitions(BUILTIN.index,async file=>{
    calls.set(file,(calls.get(file)??0)+1);active++;maximum=Math.max(maximum,active);
    try{return await readResource(file);}finally{active--;}
  });
  assert.equal(registry.configFiles.length,298);
  assert.equal(registry.catalog.length,298);
  assert.equal(calls.size,BUILTIN.configFiles.length+Object.keys(BUILTIN.sources).length);
  assert.ok([...calls.values()].every(n=>n===1));
  assert.ok(maximum>1&&maximum<=8);
  assert.equal(registry.definition.patterns[0].outputs.scalar.file,'patterns/Circle/formula.glsl');
  const circle=JSON.parse(await readResource('patterns/Circle/pattern.json'));
  assert.equal(circle.outputs.scalar.file,'formula.glsl');
  const brick=JSON.parse(await readResource('patterns/Brick/pattern.json'));
  assert.equal(brick.seamless.source.file,'periodic.glsl');
  assert.ok(Object.isFrozen(registry.index));
});
test("index rejects duplicate IDs/paths, invalid config files, ID mismatch and escaping local formula paths atomically", async () => {
  for(const change of [
    r=>r.patterns[1].id=r.patterns[0].id,
    r=>r.patterns[1].file=r.patterns[0].file,
    ...['../pattern.json','/pattern.json','https://example.com/pattern.json','patterns/a.glsl','patterns/a.json?x=1'].map(file=>r=>r.patterns[0].file=file)
  ]){const r=structuredClone(BUILTIN.index);change(r);assert.throws(()=>validateIndex(r),/图案定义错误/);}
  const first=BUILTIN.index.patterns[0].file;
  for(const [replacement,match] of [
    [()=>{throw new Error('missing config');},/Circle.*missing config/],
    [()=>'invalid JSON',/Circle.*JSON/],
    [()=>JSON.stringify({...BUILTIN.definition.patterns[0],id:'WrongID'}),/Circle.*ID/],
    [()=>{const p=structuredClone(BUILTIN.definition.patterns[0]);p.outputs.scalar.file='../outside.glsl';return JSON.stringify(p);},/非法资源路径/]
  ]) {
    let formulaReads=0;
    await assert.rejects(loadDefinitions(BUILTIN.index,file=>{
      if(file.endsWith('.glsl'))formulaReads++;
      return file===first?replacement():readResource(file);
    }),match);
    assert.equal(formulaReads,0);
  }
  assert.equal(BUILTIN.catalog[0].id,'Circle');
});

test("formula helper pruning supports comments, overloads, precision and unsigned helper dependencies", () => {
  const source=`
float nested(){return 1.;}
float unused(){return 0.;}
// float fake(){ unused(); }
uint encodeValue(){return uint(nested());}
highp float sampleValue(float x){/* } */ return float(encodeValue())+x;}
vec2 sampleValue(vec2 x){return x+vec2(nested());}
void main(){float value=sampleValue(1.);}
`;
  const result=pruneGLSL(source);
  assert.ok(result.includes('float nested()'));
  assert.ok(result.includes('uint encodeValue()'));
  assert.ok(result.includes('highp float sampleValue(float x)'));
  assert.ok(result.includes('vec2 sampleValue(vec2 x)'));
  assert.ok(!result.includes('float unused()'));
  assert.ok(result.includes('// float fake(){ unused(); }'));
});

test("definition files load atomically, once per file, and reject missing/empty assets", async () => {
  const calls = new Map();
  const registry = await loadDefinitions(clone(), file => {calls.set(file,(calls.get(file)??0)+1); return read(file);});
  assert.equal(registry.catalog.length,298);
  assert.ok([...calls.values()].every(n=>n===1));
  assert.ok(Object.isFrozen(registry.catalog[0].definition));
  const circleFile = BUILTIN.definition.patterns[0].outputs.scalar.file;
  await assert.rejects(loadDefinitions(clone(),file=>{if(file===circleFile)throw new Error('missing');return read(file);}),/Circle.*missing/);
  await assert.rejects(loadDefinitions(clone(),file=>file===circleFile?'':read(file)),/Circle/);
  assert.equal(BUILTIN.catalog[0].id,'Circle');
});
test("schema rejects incompatible ABI, duplicate IDs/slots, unstable indices, unsafe paths and missing capabilities", () => {
  const cases = [
    r=>r.abi='future', r=>r.schema='unknown', r=>r.patterns[1].id=r.patterns[0].id,
    r=>r.patterns[0].order=1, r=>r.patterns[0].parameters.push({...r.patterns[0].parameters[0]}),
    r=>r.patterns[0].defaults[0]=NaN, r=>r.patterns[0].parameters[0].max=0,
    r=>r.patterns[0].parameters[0].key='W', r=>r.patterns[0].category='unknown',
    r=>r.patterns[0].outputs.scalar.libraries=['missing'],
    r=>r.patterns[0].outputs.scalar.inline='1.',
    r=>r.patterns[0].editor.kind='bezier', r=>r.patterns[0].seamless.extent='unknown',
    r=>r.patterns[0].outputs.vector={library:'unsupported'},
    ...['../secret.glsl','/absolute.glsl','https://example.com/a.glsl','a/../../b.glsl','a\\b.glsl','a.glsl?x=1'].map(file=>r=>r.patterns[0].outputs.scalar.file=file)
  ];
  for(const change of cases){const r=clone();change(r);assert.throws(()=>validateLibrary(r),/图案定义错误/);}
});
test("multi-line body and external helper files use the same parameter ABI; inline expressions also work", async () => {
  const manifest=clone();
  manifest.patterns=[manifest.patterns[0]]; manifest.categories=[manifest.categories[0]];
  manifest.libraries={'math-v1':manifest.libraries['math-v1'],'example-v1':{file:'libraries/example-v1.glsl',abi:manifest.abi}};
  manifest.patterns[0].outputs.scalar={kind:'body',file:'formulas/example.glsl',libraries:['math-v1','example-v1']};
  const body='float value=0.;\nfor(int i=0;i<3;i++){value+=exampleFalloff(q,R+float(i)*.1);}\nreturn sat(value/3.);';
  const assets={...BUILTIN.sources,'formulas/example.glsl':body,'libraries/example-v1.glsl':'float exampleFalloff(vec2 p,float radius){return exp(-dot(p,p)/(radius*radius));}'};
  const registry=await loadDefinitions(manifest,file=>assets[file]);
  assert.ok(patternFunction(registry).includes(`case 0:{${body}}`));
  assert.equal(extraFormulaLibraries(registry,[0]),assets['libraries/example-v1.glsl']);
  manifest.patterns[0].outputs.scalar={kind:'expression',inline:'exp(-r*r/(R*R))',libraries:['math-v1']};
  const inline=await loadDefinitions(manifest,file=>assets[file]);
  assert.ok(patternFunction(inline).includes('case 0:return sat(exp(-r*r/(R*R)));'));
  assert.equal(extraFormulaLibraries(inline,[0]),'');
});
test("formula validation rejects malformed bodies/directives and URL reader reports HTTP/file failures", async () => {
  for(const [kind,inline] of [['body','float value=0.;'],['expression','return 1.;'],['body','#version 300 es\nreturn 1.;'],['expression','']]) {
    const r=clone();r.patterns[0].outputs.scalar={kind,inline,libraries:['math-v1']};
    await assert.rejects(loadDefinitions(r,read),/图案定义错误/);
  }
  await assert.rejects(loadDefinitionURL(new URL('http://localhost/definitions/builtin.json'),()=>{throw new Error('offline');}),/offline/);
  await assert.rejects(loadDefinitionURL(new URL('http://localhost/definitions/builtin.json'),()=>'broken JSON'),/JSON/);
  const r=clone();
  await assert.rejects(loadDefinitions(r,file=>file==='libraries/vector-v1.glsl'?'{{id:MissingPattern}}':read(file)),/MissingPattern/);
});
