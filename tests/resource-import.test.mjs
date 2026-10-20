import test from 'node:test';
import assert from 'node:assert/strict';
import {stageResourceFiles} from '../web/resource-import.js';
import {exportGraphicsLibrary} from '../web/graphics-export.js';
import {AUTHORING_EXAMPLE} from '../web/ai-authoring.js';
import {resources} from '../web/resource-assets.js';
import {encodeZIP} from '../web/encoders.js';
import {writeFile,mkdir} from 'node:fs/promises';
const records=[{resourceId:'1a0e9896-186d-4e19-8acd-fc6358f88a99',versionId:1,personalRevision:0,name:'ZIP圆形',category:'测试',kind:'formula',builtin:'Circle'},{resourceId:'2a0e9896-186d-4e19-8acd-fc6358f88a99',versionId:1,personalRevision:0,name:'ZIP圆环',category:'测试',kind:'formula',builtin:'Ring'}];
test('JSON and library ZIP stage candidates without persistence or registered leftovers',async()=>{
 const before=[...resources.keys()],zip=await exportGraphicsLibrary(records,()=>{throw Error('unexpected read');});
 const items=await stageResourceFiles([new File([zip],'library.zip')],()=> 'data:image/png;base64,preview');assert.equal(items.length,2);assert.deepEqual(items.map(i=>i.meta.name),['ZIP圆形','ZIP圆环']);assert.ok(items.every(i=>i.asset.kind==='formula'&&i.bytes.length>0));assert.deepEqual([...resources.keys()],before);
 const draft=await stageResourceFiles([new File([JSON.stringify(AUTHORING_EXAMPLE)],'draft.json')],()=> '');assert.equal(draft[0].draft.schema,AUTHORING_EXAMPLE.schema);
});
test('invalid file and missing bundle references are rejected before saving',async()=>{
 await assert.rejects(()=>stageResourceFiles([new File(['{}'],'bad.json')],()=>''));
 await assert.rejects(()=>stageResourceFiles([new File(['x'],'image.png')],()=>''),/JSON或ZIP/);
 const zip=encodeZIP([{name:'library.json',data:new TextEncoder().encode(JSON.stringify({schema:'momo.graphics-library/v1',entries:[{file:'absent.zip'}]}))}]);await assert.rejects(()=>stageResourceFiles([new File([zip],'bad.zip')],()=>''),/缺少/);
});
