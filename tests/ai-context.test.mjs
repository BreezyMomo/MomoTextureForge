import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibraryAIContext} from '../web/ai-context.js';
import {encodeResourcePack} from '../web/resource-pack.js';
import {node,PRESET_SCHEMA} from '../web/tree-model.js';
import {BY_ID} from '../web/catalog.js';

test('library context exports only requested builtins with current parameter metadata',async()=>{
 const c=await createLibraryAIContext([{builtin:'Ring',name:'圆环',kind:'formula',resourceId:'ring',versionId:1}],()=>{throw Error('should not read');});
 assert.equal(c.entries.length,1);assert.equal(c.entries[0].definitions[0].id,'Ring');
 assert.deepEqual(c.entries[0].definitions[0].parameters,BY_ID.get('Ring').parameters);
 assert.ok(!('nodes' in c));await assert.rejects(()=>createLibraryAIContext([],()=>null),/没有可导出/);
});
test('local bundle definitions are read without exposing formula source and remote gaps stay explicit',async()=>{
 const bytes=await encodeResourcePack({schema:PRESET_SCHEMA,name:'组合资源',root:node('shape','Circle')});
 const c=await createLibraryAIContext([{name:'组合资源',kind:'composition',resourceId:'local',versionId:2},{name:'远程图形',kind:'formula',remote:true,resourceId:'remote',versionId:3}],item=>item.remote?null:bytes);
 assert.ok(c.entries[0].definitions.some(d=>d.id==='Circle'));
 assert.ok(!JSON.stringify(c).includes('outputs'));assert.ok(c.entries[1].detailsUnavailable);
 assert.equal(c.entries[1].definitions,undefined);
});
