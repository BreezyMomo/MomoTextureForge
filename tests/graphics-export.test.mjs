import test from 'node:test';
import assert from 'node:assert/strict';
import {exportGraphicsLibrary} from '../web/graphics-export.js';
import {builtinIdentity} from '../web/graphics-library.js';
import {CATALOG} from '../web/catalog.js';
import {libraryVisible} from '../web/library-policy.js';
import {decodeZIP} from '../web/resource-zip.js';
import {readResourcePack} from '../web/resource-pack.js';
const meta=async p=>({resourceId:await builtinIdentity(p.id),versionId:p.definition.revision,builtin:p.id,name:p.zh,category:p.categoryName,kind:'formula'});
test('empty selection does not produce an empty download',async()=>{await assert.rejects(exportGraphicsLibrary([],()=>{}),/没有可导出/);});
test('selected builtins include self-contained formulas and repeatable IDs/bytes',async()=>{
 const item=await meta(CATALOG.find(p=>p.id==='Circle'));
 const first=await exportGraphicsLibrary([item],()=>{}),second=await exportGraphicsLibrary([item,item],()=>{});assert.deepEqual(first,second);
 const files=await decodeZIP(first),index=JSON.parse(new TextDecoder().decode(files.get('library.json')));assert.equal(index.entries.length,1);
 const inner=await decodeZIP(files.get(index.entries[0].file));assert.ok([...inner.keys()].some(k=>k.startsWith('formulas/')));
 const pack=await readResourcePack(files.get(index.entries[0].file));assert.equal(pack.payload.graphicResource.resourceId,item.resourceId);pack.rollback();
 const custom={...item,builtin:undefined};assert.deepEqual(await exportGraphicsLibrary([custom],()=>files.get(index.entries[0].file)),first);
});
test('all builtin graphics export with one dependency bundle per resource',async()=>{
 const records=await Promise.all(CATALOG.filter(p=>!p.id.startsWith('asset_')&&libraryVisible(p.id)).map(meta));
 const zip=await exportGraphicsLibrary(records,()=>{}),files=await decodeZIP(zip),index=JSON.parse(new TextDecoder().decode(files.get('library.json')));
 assert.equal(index.entries.length,records.length);assert.ok(records.length>256);
 for(const entry of index.entries){const pack=await readResourcePack(files.get(entry.file));assert.ok(pack.payload.root);pack.rollback();}
});
