import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {BUILTIN} from '../web/definition-runtime.js';
import thumbnails from '../web/builtin-thumbnails.js';
const root=new URL('../',import.meta.url);

test('catalog contains all current graph bodies and matching thumbnails',async()=>{
 const included=BUILTIN.index.patterns.map(p=>p.id).sort();
 assert.ok(included.length>0);
 assert.deepEqual(BUILTIN.catalog.map(p=>p.id).sort(),included);
 assert.deepEqual((await readdir(new URL('web/definitions/patterns/',root))).sort(),included);
 assert.deepEqual(Object.keys(thumbnails).sort(),included);
});

test('loaded formula sources match the current files and pattern versions are valid',async()=>{
 for(const [file,source] of Object.entries(BUILTIN.sources))assert.equal((await readFile(new URL('web/definitions/'+file,root),'utf8')).replace(/\r\n?/g,'\n'),source,file);
 for(const p of BUILTIN.catalog)assert.ok(Number.isSafeInteger(p.definition.revision)&&p.definition.revision>=1,p.id);
});

test('portable authoring bundle contains all current formula files',async()=>{
 const {default:runtime}=await import('../web/authoring-kit-runtime.js');
 const cli=runtime['scripts/texforge.mjs'];
 for(const p of BUILTIN.catalog){assert.ok(cli.includes(p.id),p.id);const spec=p.definition.outputs.scalar;if(spec.file)assert.ok(cli.includes(spec.file),p.id);else assert.ok(cli.includes(spec.inline),p.id);}
});
